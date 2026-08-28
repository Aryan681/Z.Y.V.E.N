
import transporter from "../config/email.js";
import logger from "../config/logger.js";

const emailService = {
    async sendVerificationMail(email, verificationUrl) {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject: "Verify Your Email",
                text: `Please verify your email by visiting: ${verificationUrl}`,
                html: `
                    <h2>Verify Your Email</h2>
                    <p>Click the button below to verify your account.</p>
                    <a href="${verificationUrl}">Verify Email</a>
                `,
            });

            logger.info(`Verification email sent to ${email}`);

            return info;

        } catch (error) {
            logger.error("Email Service Error", error);
            throw error;
        }
    },
    async sendPasswordResetMail(email, passwordResetUrl) {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject: "Reset Your Password",
                text: `Please reset your password by visiting: ${passwordResetUrl}`,
                html: `
                    <h2>Reset Your Password</h2>
                    <p>Click the button below to reset your password.</p>
                    <a href="${passwordResetUrl}">Reset Password</a>
                `,
            });

            logger.info(`passwordResetUrl email sent to ${email}`);

            return info;

        } catch (error) {
            logger.error("Email Service Error", error);
            throw error;
        }
    },
    async sendEmailChangeMail(email, verificationCode, isNewEmail = false) {
        try {
            const subject = isNewEmail
                ? "Confirm Your New Email Address"
                : "Authorize Email Change Request";
            const message = isNewEmail
                ? `You requested to set this email as your new account email. Your verification code is: ${verificationCode}`
                : `A request was received to change your account email. Your authorization code is: ${verificationCode}`;

            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject: subject,
                text: message,
                html: `
                    <h2>${subject}</h2>
                    <p>${message}</p>
                    <p><b>Verification Code:</b> ${verificationCode}</p>
                    <p>This code will expire in 10 minutes. If you did not make this request, please secure your account immediately.</p>
                `,
            });

            logger.info(`Email change verification code sent to ${email}`);

            return info;

        } catch (error) {
            logger.error("Email Service Error", error);
            throw error;
        }
    },
    async sendEmailChangeNotification(oldEmail, newEmail) {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: oldEmail,
                subject: "Security Alert: Your Account Email Has Been Changed",
                text: `Your account email address has been successfully changed to ${newEmail}. If you did not authorize this change, please contact support immediately.`,
                html: `
                    <h2>Email Changed Successfully</h2>
                    <p>Your account email address has been successfully changed to: <b>${newEmail}</b>.</p>
                    <p>All active sessions have been logged out as a security measure.</p>
                    <p><b>If you did not make this change:</b> Please contact our support team immediately.</p>
                `,
            });

            logger.info(`Email change success notification sent to ${oldEmail}`);

        } catch (error) {
            logger.error("Email Service Notification Error", error);
            throw error;
        }
    },
    async sendSecurityAlertMail(email, subject, message) {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject: subject,
                text: message,
                html: `
                    <h2>${subject}</h2>
                    <p>${message}</p>
                    <p><b>Recommended Action:</b> Please log in to your account and reset your password immediately if you did not initiate this action.</p>
                `,
            });

            logger.info(`Security alert email sent to ${email}`);

            return info;

        } catch (error) {
            logger.error("Email Security Alert Error", error);
            throw error;
        }
    },
    async sendLogoutMail(email, message) {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject: "Your Account Has Been Logged Out",
                text: message,
                html: `
                    <h2>Your Account Has Been Logged Out</h2>
                    <p>${message}</p>
                `,
            });

            logger.info(`Logout email sent to ${email}`);

            return info;

        } catch (error) {
            logger.error("Email Logout Error", error);
            throw error;
        }
    },
};

export default emailService;