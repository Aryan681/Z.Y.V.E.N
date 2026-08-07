// const log = (level, message, error = null) => {
//     const time = new Date().toISOString();

//     console.log(`[${time}] [${level}] ${message}`);

//     if (error) {
//         console.error(error);
//     }
// };

// const logger = {
//     info(message) {
//         log("INFO", message);
//     },

//     warn(message) {
//         log("WARN", message);
//     },

//     error(message, error = null) {
//         log("ERROR", message, error);
//     },

//     debug(message) {
//         if (process.env.NODE_ENV !== "production") {
//             log("DEBUG", message);
//         }
//     },
// };

// export default logger;