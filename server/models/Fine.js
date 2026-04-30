const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
    report_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PollutionReport',
        required: true
    },
    issued_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    polluter_name: {
        type: String,
        default: null
    },
    polluter_contact: {
        type: String,
        default: null
    },
    fine_amount: {
        type: Number,
        required: true
    },
    fine_reason: {
        type: String,
        default: null
    },
    fine_category: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['issued', 'paid', 'disputed', 'cancelled'],
        default: 'issued'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

fineSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

fineSchema.index({ report_id: 1 });

module.exports = mongoose.model('Fine', fineSchema);
