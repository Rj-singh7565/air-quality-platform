const mongoose = require('mongoose');

const pollutionReportSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: null
    },
    report_type: {
        type: String,
        enum: ['issue', 'polluter'],
        default: 'issue'
    },
    category: {
        type: String,
        required: true,
        enum: ['smoke', 'burning_waste', 'dust', 'industrial', 'vehicle', 'construction', 'other']
    },
    severity: {
        type: String,
        enum: ['low', 'moderate', 'high', 'critical'],
        default: 'moderate'
    },
    image_url: {
        type: String,
        default: null
    },
    resolution_image_url: {
        type: String,
        default: null
    },
    ai_verified: {
        type: Boolean,
        default: false
    },
    ai_confidence: {
        type: Number,
        default: 0
    },
    ai_classification: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'resolved', 'rejected'],
        default: 'pending'
    },
    admin_notes: {
        type: String,
        default: null
    },
    rejection_reason: {
        type: String,
        default: null
    },
    fine_amount: {
        type: Number,
        default: 0
    },
    fine_status: {
        type: String,
        enum: ['none', 'issued', 'paid', 'disputed'],
        default: 'none'
    },
    reward_amount: {
        type: Number,
        default: 0
    },
    rewarded_by: {
        type: String,
        default: null
    },
    rewarded_at: {
        type: Date,
        default: null
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null
    },
    upvotes: {
        type: Number,
        default: 0
    },
    downvotes: {
        type: Number,
        default: 0
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

pollutionReportSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Indexes
pollutionReportSchema.index({ category: 1 });
pollutionReportSchema.index({ status: 1 });
pollutionReportSchema.index({ report_type: 1 });
pollutionReportSchema.index({ city: 1 });
pollutionReportSchema.index({ user_id: 1 });
pollutionReportSchema.index({ latitude: 1, longitude: 1 });
pollutionReportSchema.index({ created_at: -1 });

module.exports = mongoose.model('PollutionReport', pollutionReportSchema);
