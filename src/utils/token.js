import crypto from "crypto";

const tokenHelper = {
    generateVerificationToken() {
        return crypto.randomBytes(32).toString("hex");
    },
};

export default tokenHelper;