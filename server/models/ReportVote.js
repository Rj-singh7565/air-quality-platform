const mongoose = require('mongoose');

const reportVoteSchema = new mongoose.Schema({
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
    vote_type: {
        type: String,
        enum: ['upvote', 'downvote'],
        required: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

reportVoteSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Each user can only vote once per report
reportVoteSchema.index({ report_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('ReportVote', reportVoteSchema);
