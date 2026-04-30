const User = require('../models/User');
const PollutionReport = require('../models/PollutionReport');

// @route   GET /api/users/leaderboard
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const users = await User.find()
            .select('name avatar_url contribution_score reports_count verified_reports badges created_at')
            .sort({ contribution_score: -1 })
            .limit(parseInt(limit))
            .lean();

        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            ...user,
            id: user._id,
            badges: user.badges || []
        }));

        res.json({ success: true, data: leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching leaderboard' });
    }
};

// @route   GET /api/users/:id/profile
exports.getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('name avatar_url contribution_score reports_count verified_reports badges created_at')
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const reports = await PollutionReport.find({ user_id: id })
            .select('title category severity ai_verified status upvotes downvotes created_at latitude longitude')
            .sort({ created_at: -1 })
            .limit(10)
            .lean();

        res.json({
            success: true,
            data: {
                user: { ...user, id: user._id, badges: user.badges || [] },
                recent_reports: reports
            }
        });
    } catch (error) {
        console.error('User profile error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching profile' });
    }
};

// @route   GET /api/users/stats
exports.getPlatformStats = async (req, res) => {
    try {
        const [usersCount, reportsCount, verifiedCount, citiesAgg] = await Promise.all([
            User.countDocuments(),
            PollutionReport.countDocuments(),
            PollutionReport.countDocuments({ ai_verified: true }),
            PollutionReport.distinct('city', { city: { $ne: null } })
        ]);

        res.json({
            success: true,
            data: {
                total_users: usersCount,
                total_reports: reportsCount,
                verified_reports: verifiedCount,
                cities_covered: citiesAgg.length
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};
