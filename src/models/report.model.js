import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        enum: ['spam', 'harassment', 'inappropriate', 'misinformation', 'abuse', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending'
    }
}, { timestamps: true });

// Prevent duplicate reports from same user on same post
reportSchema.index({ post: 1, reporter: 1 }, { unique: true });

const Report = mongoose.model("Report", reportSchema);

export default Report;
