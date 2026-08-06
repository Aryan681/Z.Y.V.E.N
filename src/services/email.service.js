
import transporter from "../config/email.js";
import logger from "../utils/logger.js";

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
};

export default emailService ;