const urlHelper = {
    generateVerificationUrl(verificationToken) {
        const url = new URL("/v1/auth/verify", process.env.DOMAIN);

        url.searchParams.set("token", verificationToken);

        return url.toString();
    },
    generateResetPasswordUrl(resetToken) {
        const url = new URL("/v1/auth/change-password", process.env.DOMAIN);

        url.searchParams.set("token", resetToken);

        return url.toString();
    },
};

export default urlHelper;