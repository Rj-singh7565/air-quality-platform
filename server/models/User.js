const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'municipal_admin', 'super_admin'],
        default: 'user'
    },
    approval_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    organisation: {
        type: String,
        default: null
    },
    avatar_url: {
        type: String,
        default: null
    },
    contribution_score: {
        type: Number,
        default: 0
    },
    reports_count: {
        type: Number,
        default: 0
    },
    verified_reports: {
        type: Number,
        default: 0
    },
    badges: {
        type: [String],
        default: []
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to expose _id as id
userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Index for performance (email index already created by unique: true)
userSchema.index({ role: 1 });
userSchema.index({ approval_status: 1 });

module.exports = mongoose.model('User', userSchema);
