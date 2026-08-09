import pinoHttp from "pino-http";
import logger from "../config/logger.js";

const requestLogger = pinoHttp({
    logger,

    customLogLevel(req, res, err) {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },

    customSuccessObject(req, res, data) {
        return {
            reqId: req.id,
            url: req.originalUrl,
            responseTime: data.responseTime,
        };
    },

    customErrorObject(req, res, data) {
        return {
            reqId: req.id,
            url: req.originalUrl,
            responseTime: data.responseTime,
        };
    },
     redact: [
        "req.headers.authorization",
        "req.body.password",
        "req.body.refreshToken",
        "req.body.accessToken",
        "req.query.token",
        "req.cookies.accessToken",
        "req.cookies.refreshToken",
    ],
    serializers: {
        req: () => undefined,
        res: () => undefined,
    },
});

export default requestLogger;