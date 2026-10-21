import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Email from "../models/email.model.js";
import { sendEmail as sendEmailService, sendBulkEmail, sendTemplateEmail } from '../services/email.service.js';

const sendBulkEmails = asyncHandler(async (req, res) => {
    const { subject, body, filter, type } = req.body;

    if (!subject || !body) {
        throw new ApiError(400, "Subject and body are required");
    }

    // Validate filter
    const validFilters = ['student', 'alumni', 'donor', 'all'];
    if (filter && !validFilters.includes(filter)) {
        throw new ApiError(400, "Invalid filter. Must be: student, alumni, donor, or all");
    }

    // Send bulk emails with type and sentBy
    const result = await sendBulkEmail(
        subject, 
        body, 
        filter || 'all', 
        type || 'quick_message',
        req.user?._id
    );

    if (!result.success) {
        throw new ApiError(500, result.error || "Failed to send bulk emails");
    }

    res
        .status(200)
        .json(new ApiResponse(
            200, 
            result,
            `Bulk emails sent. Success: ${result.totalSent}, Failed: ${result.totalFailed}`
        ));
});

const getEmailHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const emails = await Email.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('sentBy', 'name email');

    const total = await Email.countDocuments();

    res
        .status(200)
        .json(new ApiResponse(
            200,
            {
                emails,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            },
            "Email history fetched successfully"
        ));
});

export { 
    sendBulkEmails,
    getEmailHistory
};