const PollutionReport = require('../models/PollutionReport');
const User = require('../models/User');
const Reward = require('../models/Reward');
const Fine = require('../models/Fine');

exports.getAllReports = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, category, city, sort = 'newest', report_type } = req.query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (city) filter.city = new RegExp(`^${city}$`, 'i');
        if (report_type) filter.report_type = report_type;

        let sortObj = { created_at: -1 };
        if (sort === 'oldest') sortObj = { created_at: 1 };
        else if (sort === 'upvotes') sortObj = { upvotes: -1, created_at: -1 };

        const reports = await PollutionReport.find(filter)
            .populate('user_id', 'name email contribution_score reports_count')
            .sort(sortObj).skip(parseInt(skip)).limit(parseInt(limit)).lean();

        if (sort === 'severity') {
            const order = { critical: 1, high: 2, moderate: 3, low: 4 };
            reports.sort((a, b) => (order[a.severity] || 5) - (order[b.severity] || 5));
        }

        const mapped = reports.map(r => ({
            ...r, id: r._id, reporter_name: r.user_id?.name || 'Unknown',
            reporter_email: r.user_id?.email, reporter_score: r.user_id?.contribution_score,
            reporter_total_reports: r.user_id?.reports_count, user_id: r.user_id?._id || r.user_id
        }));

        const total = await PollutionReport.countDocuments(filter);

        const statusCounts = await PollutionReport.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const statusMap = {};
        statusCounts.forEach(s => { statusMap[s._id] = s.count; });

        res.json({ success: true, data: mapped, statusCounts: statusMap,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('Admin get reports error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes, rejection_reason } = req.body;
        const validStatuses = ['pending', 'reviewing', 'resolved', 'rejected'];
        if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
        if (status === 'rejected' && !rejection_reason) return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting a report' });

        const report = await PollutionReport.findById(id);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        const updated = await PollutionReport.findByIdAndUpdate(id, {
            status, admin_notes: admin_notes || report.admin_notes,
            rejection_reason: rejection_reason || report.rejection_reason
        }, { new: true });

        res.json({ success: true, message: `Report status updated to "${status}"`, data: updated });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.rewardCitizen = async (req, res) => {
    try {
        const { id } = req.params;
        const { points, message } = req.body;
        if (!points || points < 1 || points > 500) return res.status(400).json({ success: false, message: 'Points must be between 1 and 500' });

        const report = await PollutionReport.findById(id).populate('user_id', 'name contribution_score');
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        await Reward.create({ report_id: id, user_id: report.user_id._id, admin_id: req.user.id, reward_type: 'points', points: parseInt(points), message: message || null });

        await PollutionReport.findByIdAndUpdate(id, {
            $inc: { reward_amount: parseInt(points) },
            rewarded_by: req.user.name, rewarded_at: new Date(), status: 'resolved'
        });

        const updatedUser = await User.findByIdAndUpdate(report.user_id._id,
            { $inc: { contribution_score: parseInt(points) } }, { new: true });

        res.json({ success: true, message: `Awarded ${points} points to ${updatedUser.name}! Their new score: ${updatedUser.contribution_score}`,
            data: { reward_id: null, citizen_name: updatedUser.name, new_score: updatedUser.contribution_score, points_awarded: parseInt(points) } });
    } catch (error) {
        console.error('Reward citizen error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.applyFine = async (req, res) => {
    try {
        const { id } = req.params;
        const { fine_amount, polluter_name, polluter_contact, fine_reason } = req.body;
        if (!fine_amount || fine_amount <= 0) return res.status(400).json({ success: false, message: 'Fine amount must be greater than 0' });

        const report = await PollutionReport.findById(id);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
        if (report.report_type !== 'polluter') return res.status(400).json({ success: false, message: 'Fines can only be applied to polluter reports' });

        const fine = await Fine.create({
            report_id: id, issued_by: req.user.id, polluter_name: polluter_name || null,
            polluter_contact: polluter_contact || null, fine_amount: parseFloat(fine_amount),
            fine_reason: fine_reason || null, fine_category: report.category, status: 'issued'
        });

        await PollutionReport.findByIdAndUpdate(id, { fine_amount: parseFloat(fine_amount), fine_status: 'issued', status: 'resolved' });
        await User.findByIdAndUpdate(report.user_id, { $inc: { contribution_score: 20 } });

        res.json({ success: true, message: `Fine of ₹${fine_amount} applied successfully for polluter report`,
            data: { fine_id: fine._id, fine_amount: parseFloat(fine_amount), polluter_name } });
    } catch (error) {
        console.error('Apply fine error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.verifyResolution = async (req, res) => {
    try {
        const { id } = req.params;
        const { verified, admin_notes } = req.body;

        const report = await PollutionReport.findById(id);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
        if (!report.resolution_image_url) return res.status(400).json({ success: false, message: 'No resolution proof has been uploaded for this report' });

        const newStatus = verified ? 'resolved' : 'reviewing';
        await PollutionReport.findByIdAndUpdate(id, { status: newStatus, admin_notes: admin_notes || report.admin_notes });

        if (verified) await User.findByIdAndUpdate(report.user_id, { $inc: { contribution_score: 15 } });

        res.json({ success: true, message: verified ? 'Resolution verified! Citizen earned +15 points.' : 'Resolution proof rejected. Report returned to reviewing.', data: { status: newStatus } });
    } catch (error) {
        console.error('Verify resolution error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAdminStats = async (req, res) => {
    try {
        const [totalReports, pendingReports, reviewingReports, resolvedReports, rejectedReports,
            totalUsers, polluterReports, pendingAuthorities] = await Promise.all([
            PollutionReport.countDocuments(),
            PollutionReport.countDocuments({ status: 'pending' }),
            PollutionReport.countDocuments({ status: 'reviewing' }),
            PollutionReport.countDocuments({ status: 'resolved' }),
            PollutionReport.countDocuments({ status: 'rejected' }),
            User.countDocuments({ role: 'user' }),
            PollutionReport.countDocuments({ report_type: 'polluter' }),
            User.countDocuments({ role: 'municipal_admin', approval_status: 'pending' })
        ]);

        const rewardAgg = await Reward.aggregate([{ $group: { _id: null, total: { $sum: '$points' }, count: { $sum: 1 } } }]);
        const totalRewards = rewardAgg[0]?.total || 0;
        const rewardCount = rewardAgg[0]?.count || 0;

        const fineAgg = await Fine.aggregate([{ $group: { _id: null, total: { $sum: '$fine_amount' }, count: { $sum: 1 } } }]);
        const totalFinesAmount = fineAgg[0]?.total || 0;
        const totalFinesCount = fineAgg[0]?.count || 0;

        const byCategory = await PollutionReport.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $project: { _id: 0, category: '$_id', count: 1 } }]);
        const byCity = await PollutionReport.aggregate([{ $match: { city: { $ne: null } } }, { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }, { $project: { _id: 0, city: '$_id', count: 1 } }]);

        const recentRewards = await Reward.find().populate('user_id', 'name').populate('report_id', 'title').sort({ created_at: -1 }).limit(10).lean();
        const mappedRewards = recentRewards.map(r => ({ ...r, citizen_name: r.user_id?.name, report_title: r.report_id?.title }));

        const pendingResolutions = await PollutionReport.countDocuments({ resolution_image_url: { $ne: null }, status: 'reviewing' });

        res.json({ success: true, data: {
            total_reports: totalReports, pending: pendingReports, reviewing: reviewingReports,
            resolved: resolvedReports, rejected: rejectedReports, total_citizens: totalUsers,
            total_rewards_points: totalRewards, total_rewards_given: rewardCount,
            polluter_reports: polluterReports, total_fines_amount: totalFinesAmount,
            total_fines_count: totalFinesCount, pending_authorities: pendingAuthorities,
            pending_resolutions: pendingResolutions, by_category: byCategory, by_city: byCity,
            recent_rewards: mappedRewards
        }});
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCitizens = async (req, res) => {
    try {
        const { search, sort = 'score' } = req.query;
        const filter = { role: 'user' };
        if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

        let sortObj = { contribution_score: -1 };
        if (sort === 'reports') sortObj = { reports_count: -1 };
        else if (sort === 'newest') sortObj = { created_at: -1 };

        const citizens = await User.find(filter).select('name email contribution_score reports_count verified_reports created_at')
            .sort(sortObj).limit(100).lean();

        res.json({ success: true, data: citizens.map(c => ({ ...c, id: c._id })) });
    } catch (error) {
        console.error('Get citizens error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getPendingAuthorities = async (req, res) => {
    try {
        const authorities = await User.find({ role: 'municipal_admin' })
            .select('name email organisation approval_status created_at')
            .sort({ approval_status: 1, created_at: -1 }).lean();
        res.json({ success: true, data: authorities.map(a => ({ ...a, id: a._id })) });
    } catch (error) {
        console.error('Get authorities error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.approveAuthority = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Action must be approve or reject' });

        const authority = await User.findOne({ _id: id, role: 'municipal_admin' });
        if (!authority) return res.status(404).json({ success: false, message: 'Municipal authority not found' });

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await User.findByIdAndUpdate(id, { approval_status: newStatus });

        res.json({ success: true, message: `Municipal authority "${authority.name}" has been ${newStatus}`,
            data: { id, name: authority.name, approval_status: newStatus } });
    } catch (error) {
        console.error('Approve authority error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getFines = async (req, res) => {
    try {
        const fines = await Fine.find().populate('report_id', 'title category').populate('issued_by', 'name')
            .sort({ created_at: -1 }).limit(100).lean();

        const mapped = fines.map(f => ({
            ...f, id: f._id, report_title: f.report_id?.title, report_category: f.report_id?.category,
            issued_by_name: f.issued_by?.name
        }));

        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Get fines error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
