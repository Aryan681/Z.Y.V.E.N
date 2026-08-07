import pinoHttp from "pino-http";
import logger from "../config/logger.js";

const requestLogger = pinoHttp({
    logger,
        customLogLevel(req, res, err) {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
     redact: [
        "req.headers.authorization",
        "req.body.password",
        "req.body.refreshToken",
    ],
});

export default requestLogger;