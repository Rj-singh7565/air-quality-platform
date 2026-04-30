const PollutionReport = require('../models/PollutionReport');
const User = require('../models/User');
const ReportVote = require('../models/ReportVote');

exports.createReport = async (req, res) => {
    try {
        const { title, description, report_type = 'issue', category, severity, latitude, longitude, address, city,
            ai_verified, ai_confidence, ai_classification } = req.body;

        if (!title || !category || !latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Please provide title, category, and location' });
        }

        const validCategories = ['smoke', 'burning_waste', 'dust', 'industrial', 'vehicle', 'construction', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ success: false, message: `Category must be one of: ${validCategories.join(', ')}` });
        }

        const validTypes = ['issue', 'polluter'];
        if (!validTypes.includes(report_type)) {
            return res.status(400).json({ success: false, message: 'Report type must be issue or polluter' });
        }

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const isVerified = ai_verified === 'true' || ai_verified === true;

        const report = await PollutionReport.create({
            user_id: req.user.id, title, description: description || null, report_type, category,
            severity: severity || 'moderate', image_url: imageUrl, ai_verified: isVerified,
            ai_confidence: parseFloat(ai_confidence) || 0, ai_classification: ai_classification || null,
            latitude: parseFloat(latitude), longitude: parseFloat(longitude),
            address: address || null, city: city || null
        });

        const bonusPoints = isVerified ? 15 : 10;
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { reports_count: 1, contribution_score: bonusPoints, verified_reports: isVerified ? 1 : 0 }
        });

        res.status(201).json({ success: true, message: 'Report created successfully! You earned +' + bonusPoints + ' points.', data: report });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ success: false, message: 'Server error creating report' });
    }
};

exports.uploadResolutionProof = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await PollutionReport.findById(id);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        if (report.user_id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the original reporter can upload resolution proof' });
        }
        if (!['pending', 'reviewing', 'resolved'].includes(report.status)) {
            return res.status(400).json({ success: false, message: 'Cannot upload resolution for rejected reports' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an "after" image as resolution proof' });
        }

        const updated = await PollutionReport.findByIdAndUpdate(id,
            { resolution_image_url: `/uploads/${req.file.filename}`, status: 'reviewing' }, { new: true });

        res.json({ success: true, message: 'Resolution proof uploaded! The municipal authority will verify it.', data: updated });
    } catch (error) {
        console.error('Upload resolution error:', error);
        res.status(500).json({ success: false, message: 'Server error uploading resolution' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, city, status, report_type } = req.query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (category) filter.category = category;
        if (city) filter.city = new RegExp(`^${city}$`, 'i');
        if (status) filter.status = status;
        if (report_type) filter.report_type = report_type;

        const reports = await PollutionReport.find(filter).populate('user_id', 'name avatar_url')
            .sort({ created_at: -1 }).skip(parseInt(skip)).limit(parseInt(limit)).lean();

        const mappedReports = reports.map(r => ({
            ...r, id: r._id, reporter_name: r.user_id?.name || 'Unknown',
            reporter_avatar: r.user_id?.avatar_url || null, user_id: r.user_id?._id || r.user_id
        }));

        const total = await PollutionReport.countDocuments(filter);
        res.json({ success: true, data: mappedReports, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching reports' });
    }
};

exports.getMyReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (page - 1) * limit;
        const filter = { user_id: req.user.id };
        if (status) filter.status = status;

        const reports = await PollutionReport.find(filter).sort({ created_at: -1 }).skip(parseInt(skip)).limit(parseInt(limit)).lean();
        const total = await PollutionReport.countDocuments(filter);
        res.json({ success: true, data: reports, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('Get my reports error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching reports' });
    }
};

exports.getNearbyReports = async (req, res) => {
    try {
        const { latitude, longitude, radius = 5000 } = req.query;
        if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Please provide latitude and longitude' });

        const lat = parseFloat(latitude), lng = parseFloat(longitude);
        const degreeRadius = parseInt(radius) / 111000;

        const reports = await PollutionReport.find({
            latitude: { $gte: lat - degreeRadius, $lte: lat + degreeRadius },
            longitude: { $gte: lng - degreeRadius, $lte: lng + degreeRadius }
        }).populate('user_id', 'name').sort({ created_at: -1 }).limit(50).lean();

        const mapped = reports.map(r => ({ ...r, id: r._id, reporter_name: r.user_id?.name || 'Unknown', user_id: r.user_id?._id || r.user_id }));
        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Nearby reports error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching nearby reports' });
    }
};

exports.getHotspots = async (req, res) => {
    try {
        const { city, days = 30 } = req.query;
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

        const matchStage = { created_at: { $gte: dateThreshold } };
        if (city) matchStage.city = new RegExp(`^${city}$`, 'i');

        const hotspots = await PollutionReport.aggregate([
            { $match: matchStage },
            { $group: { _id: { city: '$city', category: '$category' }, report_count: { $sum: 1 }, avg_longitude: { $avg: '$longitude' }, avg_latitude: { $avg: '$latitude' }, avg_confidence: { $avg: '$ai_confidence' }, latest_report: { $max: '$created_at' } } },
            { $match: { report_count: { $gte: 2 } } },
            { $sort: { report_count: -1 } },
            { $limit: 20 },
            { $project: { _id: 0, city: '$_id.city', category: '$_id.category', report_count: 1, avg_longitude: 1, avg_latitude: 1, avg_confidence: 1, latest_report: 1 } }
        ]);

        res.json({ success: true, data: hotspots });
    } catch (error) {
        console.error('Hotspots error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching hotspots' });
    }
};

exports.voteReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { vote_type } = req.body;
        if (!['upvote', 'downvote'].includes(vote_type)) return res.status(400).json({ success: false, message: 'Vote type must be upvote or downvote' });

        const existingVote = await ReportVote.findOne({ report_id: id, user_id: req.user.id });
        if (existingVote) { existingVote.vote_type = vote_type; await existingVote.save(); }
        else { await ReportVote.create({ report_id: id, user_id: req.user.id, vote_type }); }

        const upvotes = await ReportVote.countDocuments({ report_id: id, vote_type: 'upvote' });
        const downvotes = await ReportVote.countDocuments({ report_id: id, vote_type: 'downvote' });
        await PollutionReport.findByIdAndUpdate(id, { upvotes, downvotes });

        if (vote_type === 'upvote' && !existingVote) {
            const report = await PollutionReport.findById(id);
            if (report) await User.findByIdAndUpdate(report.user_id, { $inc: { contribution_score: 2 } });
        }

        res.json({ success: true, message: 'Vote recorded', data: { upvotes, downvotes } });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ success: false, message: 'Server error recording vote' });
    }
};
