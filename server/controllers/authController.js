const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, name: user.name, role: user.role || 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password, role = 'user', organisation } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Only allow 'user' or 'municipal_admin' roles on self-registration
        const allowedRoles = ['user', 'municipal_admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        // Municipal authority registration requires organisation
        if (role === 'municipal_admin' && !organisation) {
            return res.status(400).json({
                success: false,
                message: 'Municipality/Organisation name is required for authority registration'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Municipal admins start as pending until super admin approves
        const approvalStatus = role === 'municipal_admin' ? 'pending' : 'approved';

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
            approval_status: approvalStatus,
            organisation: organisation || null
        });

        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            approval_status: user.approval_status,
            organisation: user.organisation,
            contribution_score: user.contribution_score,
            reports_count: user.reports_count,
            verified_reports: user.verified_reports,
            badges: user.badges,
            created_at: user.created_at
        };

        // For municipal_admin pending approval, don't issue token - they need to wait
        if (role === 'municipal_admin' && approvalStatus === 'pending') {
            return res.status(201).json({
                success: true,
                message: 'Registration submitted! Your account is pending approval by the Super Admin. You will be able to log in once approved.',
                data: {
                    user: { id: user._id, name: user.name, email: user.email, role: user.role, approval_status: user.approval_status },
                    token: null,
                    pending: true
                }
            });
        }

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: userData,
                token
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Block pending municipal admins
        if (user.role === 'municipal_admin' && user.approval_status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Your municipal authority account is pending approval by the Super Admin. Please wait for approval before logging in.',
                pending: true
            });
        }

        // Block rejected municipal admins
        if (user.role === 'municipal_admin' && user.approval_status === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Your municipal authority account registration was rejected. Please contact the administrator.',
                rejected: true
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role || 'user',
                    approval_status: user.approval_status,
                    organisation: user.organisation,
                    contribution_score: user.contribution_score,
                    reports_count: user.reports_count,
                    verified_reports: user.verified_reports,
                    badges: user.badges || [],
                    created_at: user.created_at
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                approval_status: user.approval_status,
                organisation: user.organisation,
                avatar_url: user.avatar_url,
                contribution_score: user.contribution_score,
                reports_count: user.reports_count,
                verified_reports: user.verified_reports,
                badges: user.badges || [],
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
