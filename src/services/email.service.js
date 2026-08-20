
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
};

export default emailService ;