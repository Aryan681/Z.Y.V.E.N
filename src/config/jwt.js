const requiredEnv = (name) => {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};

const jwtConfig = {
    access: {
        secret: requiredEnv("JWT_ACCESS_SECRET"),
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "20m",
    },

    refresh: {
        secret: requiredEnv("JWT_REFRESH_SECRET"),
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },

    issuer: requiredEnv("JWT_ISSUER"),
    audience: requiredEnv("JWT_AUDIENCE"),

    algorithm: "HS256",
};

export default jwtConfig;