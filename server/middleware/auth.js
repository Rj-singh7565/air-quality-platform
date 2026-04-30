const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }

        next();
    } catch (error) {
        next();
    }
};

const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('role approval_status');

        if (!user || user.role !== 'municipal_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Municipal admin privileges required.' });
        }

        if (user.approval_status !== 'approved') {
            return res.status(403).json({ success: false, message: 'Your account is pending approval.' });
        }

        req.user = decoded;
        req.user.role = user.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

// Super admin middleware (for approving municipal authorities)
const superAdminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('role');

        if (!user || user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Super admin privileges required.' });
        }

        req.user = decoded;
        req.user.role = user.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

// Either municipal admin or super admin can access
const anyAdminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('role approval_status');

        if (!user || !['municipal_admin', 'super_admin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
        }

        if (user.role === 'municipal_admin' && user.approval_status !== 'approved') {
            return res.status(403).json({ success: false, message: 'Your account is pending approval.' });
        }

        req.user = decoded;
        req.user.role = user.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

module.exports = { auth, optionalAuth, adminAuth, superAdminAuth, anyAdminAuth };
