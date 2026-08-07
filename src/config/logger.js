import pino from "pino";

const isProduction = process.env.NODE_ENV === "prod";

const options = {
    level: isProduction ? "info" : "debug",
};

if (!isProduction) {
    options.transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    };
}

const logger = pino(options);

export default logger;