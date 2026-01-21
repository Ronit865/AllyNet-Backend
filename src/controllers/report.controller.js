import asyncHandler from '../utils/asyncHandler.js';
import Report from '../models/report.model.js';
import Post from '../models/post.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Get all reports for admin
const getReports = asyncHandler(async (req, res) => {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status !== 'all') {
        query.status = status;
    }

    const reports = await Report.find(query)
        .populate('post', 'content category createdAt author')
        .populate('reporter', 'name email avatar')
        .populate({
            path: 'post',
            populate: {
                path: 'author',
                select: 'name email avatar reportCount banStatus'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const totalReports = await Report.countDocuments(query);

    return res
        .status(200)
        .json(new ApiResponse(200, {
            reports,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalReports / limit),
                totalReports
            }
        }, "Reports fetched successfully"));
});

// Get reported users with aggregated report counts
const getReportedUsers = asyncHandler(async (req, res) => {
    // Aggregate reports by post author
    const reportedUsers = await Report.aggregate([
        {
            $lookup: {
                from: 'posts',
                localField: 'post',
                foreignField: '_id',
                as: 'postData'
            }
        },
        { $unwind: '$postData' },
        {
            $group: {
                _id: '$postData.author',
                reportCount: { $sum: 1 },
                reports: { $push: { reason: '$reason', createdAt: '$createdAt', postId: '$post' } }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                _id: 1,
                reportCount: 1,
                reports: { $slice: ['$reports', 5] },
                user: {
                    name: '$user.name',
                    email: '$user.email',
                    avatar: '$user.avatar',
                    banStatus: '$user.banStatus',
                    banReason: '$user.banReason',
                    banExpiresAt: '$user.banExpiresAt'
                }
            }
        },
        { $sort: { reportCount: -1 } }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, reportedUsers, "Reported users fetched successfully"));
});

// Ban a user (temp or permanent)
const banUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { type, duration, reason } = req.body;

    if (!['temp_banned', 'suspended'].includes(type)) {
        throw new ApiError(400, "Invalid ban type. Use 'temp_banned' or 'suspended'");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role === 'admin') {
        throw new ApiError(400, "Cannot ban an admin user");
    }

    user.banStatus = type;
    user.banReason = reason || (type === 'suspended' ? 'Account suspended' : 'Temporary ban');

    if (type === 'temp_banned' && duration) {
        // Duration in days
        user.banExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    } else if (type === 'suspended') {
        user.banExpiresAt = null; // Permanent
    }

    await user.save();

    // Update all pending reports for this user's posts to 'resolved'
    const userPosts = await Post.find({ author: userId }).select('_id');
    await Report.updateMany(
        { post: { $in: userPosts.map(p => p._id) }, status: 'pending' },
        { status: 'resolved' }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, {
            banStatus: user.banStatus,
            banReason: user.banReason,
            banExpiresAt: user.banExpiresAt
        }, `User ${type === 'suspended' ? 'suspended' : 'temporarily banned'} successfully`));
});

// Unban a user
const unbanUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.banStatus = 'active';
    user.banReason = null;
    user.banExpiresAt = null;

    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, { banStatus: 'active' }, "User unbanned successfully"));
});

// Dismiss a report
const dismissReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await Report.findByIdAndUpdate(
        reportId,
        { status: 'dismissed' },
        { new: true }
    );

    if (!report) {
        throw new ApiError(404, "Report not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, report, "Report dismissed"));
});

export {
    getReports,
    getReportedUsers,
    banUser,
    unbanUser,
    dismissReport
};
