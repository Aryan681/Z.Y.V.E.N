
import redis from "redis";
import logger from "./logger.js";

const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redisClient = redis.createClient({url:redisUrl});
redisClient.on(`connect`, () => {
    logger.info(`Redis connecting...`);
});

redisClient.on(`ready`, () => {
    logger.info(`Redis connected and ready`);
});

redisClient.on(`error`, (err) => {
    logger.error(`Redis Client Error${err}`);
});

redisClient.on(`reconnecting`, () => {
    logger.warn(`Redis reconnecting...`);
});

await redisClient.connect();
export default redisClient;