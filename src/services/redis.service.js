import redisClient from "../config/redis.js";
import logger from "../config/logger.js";

const redisService = {
  ratelimit:async(key,expireSeconds)=>{
    try{
      const script = `
        local count = redis.call("INCR", KEYS[1])
        if count == 1 then
          redis.call("EXPIRE", KEYS[1], ARGV[1])
        end
        return count

      `;
      return await redisClient.eval(script, {
      keys: [key],
      arguments: [String(expireSeconds)],
    });
      logger.info(`Redis ratelimit key ${key} successfully`);
      return result;
    }catch(error){
      logger.error(`Redis ratelimit key ${key} error ${error}`);
      throw error;
    }
  },
  set: async (key, value) => {
    try {
      await redisClient.set(key, value);
      logger.info(`Redis set key ${key} successfully`);
    } catch (error) {
      logger.error(`Redis set key ${key} error ${error}`);
      throw error;
    }
  },
  get: async (key) => {
    try {
      const value = await redisClient.get(key);
      logger.info(`Redis get key ${key} successfully`);
      return value;
    } catch (error) {
      logger.error(`Redis get key ${key} error ${error}`);
      throw error;
    }
  },
  del: async (key) => {
    try {
      await redisClient.del(key);
      logger.info(`Redis delete key ${key} successfully`);
    } catch (error) {
      logger.error(`Redis delete key ${key} error ${error}`);
      throw error;
    }
  },
  getAllPattern: async (pattern) => {
    try {
      const keys = [];
      for await (const key of redisClient.scanIterator({
        MATCH: pattern,
        COUNT: 200,
      })) {
        keys.push(key);
      }
      logger.debug(
        `Redis pattern scan completed${ pattern, key.length }`,
      );
      return keys;
    } catch (error) {
      logger.error(`Redis get all keys ${pattern} error ${error}`);
      throw error;
    }
  },
  getNestedPattern: async (key,field) => {
    try {
        const key = await redisClient.hGet(key, field);
        logger.info(`Redis get  nested key ${key}${field} successfully`);
        return key;
    }catch (error) {
      logger.error(`Redis get all nested keys ${key} error ${error}`);
      throw error;
    }
  },
  increase: async (key) => {
    try {
      const value = await redisClient.incr(key);
      logger.info(`Redis increase key ${key} successfully`);
      return value;
    } catch (error) {
      logger.error(`Redis increase key ${key} error ${error}`);
      throw error;
    }
  },
  expire: async (key, seconds) => {
    try {
      await redisClient.expire(key, seconds);
      logger.info(`Redis expire key ${key} successfully`);
    } catch (error) {
      logger.error(`Redis expire key ${key} error ${error}`);
      throw error;
    }
  },
  setWithExpiry: async (key, value, seconds) => {
    try {
      await redisClient.set(key, value, "EX", seconds);
      logger.info(`Redis set key ${key} successfully`);
    } catch (error) {
      logger.error(`Redis set key ${key} error ${error}`);
      throw error;
    }
  },
  

};
export default redisService;
