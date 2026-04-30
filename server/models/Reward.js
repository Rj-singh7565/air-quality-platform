const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    report_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PollutionReport',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reward_type: {
        type: String,
        default: 'points'
    },
    points: {
        type: Number,
        default: 0
    },
    message: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

rewardSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

rewardSchema.index({ user_id: 1 });
rewardSchema.index({ report_id: 1 });

module.exports = mongoose.model('Reward', rewardSchema);
