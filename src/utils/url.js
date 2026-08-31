import {generateURI } from 'otplib';
const urlHelper = {
    generateVerificationUrl(verificationToken) {
        const url = new URL("/v1/auth/verify", process.env.DOMAIN);

        url.searchParams.set("token", verificationToken);

        return url.toString();
    },
    generateResetPasswordUrl(resetToken) {
        const url = new URL("/v1/auth/reset-password", process.env.DOMAIN);

        url.searchParams.set("token", resetToken);

        return url.toString();
    },
    generateQrCodeUrl(secret,email) {
       const otpauthUrl = generateURI({
            label: email,
            issuer: "Zeven",
            secret,
        });
        return otpauthUrl;
    },
};

export default urlHelper;