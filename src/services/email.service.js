import nodemailer from 'nodemailer';
import User from '../models/user.model.js';
import Email from '../models/email.model.js';

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const createEmailTemplate = (subject, body) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                                        AllyNet - VGEC
                                    </h1>
                                    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 14px; letter-spacing: 1px;">
                                        Vishwakarma Government Engineering College
                                    </p>
                                </td>
                            </tr>

                            <!-- Divider -->
                            <tr>
                                <td style="height: 4px; background: linear-gradient(90deg, #00ff9f 0%, #00b8ff 100%);"></td>
                            </tr>

                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 40px 30px; background-color: #ffffff;">
                                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                        ${subject}
                                    </h2>
                                    <div style="color: #666666; line-height: 1.8; font-size: 15px;">
                                        ${body}
                                    </div>
                                </td>
                            </tr>

                            <!-- Divider -->
                            <tr>
                                <td style="height: 2px; background-color: #e0e0e0;"></td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #f9f9f9; padding: 30px; text-align: center;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding-bottom: 15px;">
                                                <p style="margin: 0; color: #333333; font-size: 14px; font-weight: 600;">
                                                    AllyNet - Alumni Network Platform
                                                </p>
                                                <p style="margin: 5px 0 0 0; color: #666666; font-size: 13px;">
                                                    Vishwakarma Government Engineering College, Ahmedabad
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-top: 15px; border-top: 1px solid #e0e0e0;">
                                                <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6;">
                                                    This is an automated email from AllyNet. Please do not reply to this email.<br>
                                                    For any queries, contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #667eea; text-decoration: none;">${process.env.EMAIL_USER}</a>
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-top: 15px;">
                                                <p style="margin: 0; color: #cccccc; font-size: 11px;">
                                                    © ${new Date().getFullYear()} AllyNet - VGEC. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

export const sendEmail = async (to, subject, body) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'AllyNet - VGEC',
                address: process.env.EMAIL_USER
            },
            to: to,
            subject: subject,
            html: createEmailTemplate(subject, body)
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

export const sendBulkEmail = async (subject, body, filter, type = 'quick_message', sentBy = null) => {
    try {
        let query = {};
        
        // Apply filter: 'student', 'alumni', 'donor', or 'all'
        if (filter && filter !== 'all') {
            query.role = filter;
        }

        // Fetch users based on filter
        const users = await User.find(query).select('email');
        
        if (!users || users.length === 0) {
            return { success: false, error: 'No users found for the given filter' };
        }

        const transporter = createTransporter();
        const results = [];

        // Send emails to all filtered users
        for (const user of users) {
            try {
                const mailOptions = {
                    from: {
                        name: 'AllyNet - VGEC',
                        address: process.env.EMAIL_USER
                    },
                    to: user.email,
                    subject: subject,
                    html: createEmailTemplate(subject, body)
                };

                const result = await transporter.sendMail(mailOptions);
                results.push({ 
                    email: user.email, 
                    success: true, 
                    messageId: result.messageId 
                });
            } catch (error) {
                results.push({ 
                    email: user.email, 
                    success: false, 
                    error: error.message 
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        // Save email record to database
        try {
            const emailRecord = new Email({
                to: filter || 'all',
                subject,
                body,
                type,
                totalSent: successCount,
                totalFailed: failedCount,
                status: failedCount === 0 ? 'sent' : (successCount === 0 ? 'failed' : 'partial'),
                sentBy
            });
            await emailRecord.save();
        } catch (dbError) {
            console.error('Error saving email record to database:', dbError);
        }

        return {
            success: true,
            totalSent: successCount,
            totalFailed: failedCount,
            details: results
        };
    } catch (error) {
        console.error('Error sending bulk emails:', error);
        return { success: false, error: error.message };
    }
};

export const sendTemplateEmail = async (to, subject, templateData) => {
    return await sendEmail(to, subject, templateData.body);
};