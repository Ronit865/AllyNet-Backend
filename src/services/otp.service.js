import nodemailer from 'nodemailer';

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

export const sendOtp = async (email, otp) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'College Name',
                address: process.env.EMAIL_USER
            },
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Password Reset</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f9f9f9;">
                        <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
                        <p style="color: #666; line-height: 1.6;">
                            You requested to reset your password. Use the OTP below to verify your email address:
                        </p>
                        <div style="background-color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #00ff9f; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
                        </div>
                        <p style="color: #666; line-height: 1.6;">
                            This OTP will expire in <strong>15 minutes</strong>. If you didn't request this, please ignore this email.
                        </p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            <p style="color: #999; font-size: 12px;">
                                This is an automated email. Please do not reply to this email.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};