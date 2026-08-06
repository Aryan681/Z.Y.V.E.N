const urlHelper = {
    generateVerificationUrl(verificationToken) {
        const url = new URL("/v1/auth/verify", process.env.DOMAIN);

        url.searchParams.set("token", verificationToken);

        return url.toString();
    },
};

export default urlHelper;