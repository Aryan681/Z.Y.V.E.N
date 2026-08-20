import redisService from "../services/redis.service.js";
import logger from "../config/logger.js";
import responseHelper from "../utils/response.js";
import defaults from "../constants/defaults.js";

// In-Memory Fallback Store when Redis is unavailable
const memoryFallbackStore = new Map();

const rateLimitMiddleware = ({ key, maxRequests, expirySeconds }) => {
  return async (req, res, next) => {
    const ipAddress = req.ip;
    const redisKey = `${key}:${ipAddress}`;

    try {
      // Primary: Attempt rate limiting via Redis
      const currentRequests = await redisService.ratelimit(redisKey, expirySeconds);

      if (currentRequests > maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${ipAddress}`);
        return responseHelper.customResponse(
          res,
          defaults.TOO_MANY_REQUESTS_CODE,
          "Too many requests",
          {
            error: `Too many requests. Please try again after ${expirySeconds} seconds`,
          },
        );
      }

      return next();
    } catch (error) {
      logger.error(`Redis unavailable in rate limiter for IP ${ipAddress}: ${error.message}`);

      // --- IN-MEMORY FALLBACK STRATEGY ---
      try {
        const now = Date.now();
        const record = memoryFallbackStore.get(redisKey);

        if (!record || now > record.resetTime) {
          memoryFallbackStore.set(redisKey, {
            count: 1,
            resetTime: now + expirySeconds * 1000,
          });
          return next();
        }

        record.count += 1;

        if (record.count > maxRequests) {
          logger.warn(`[Fallback] Rate limit exceeded for IP: ${ipAddress}`);
          return responseHelper.customResponse(
            res,
            defaults.TOO_MANY_REQUESTS_CODE,
            "Too many requests",
            {
              error: `Too many requests. Please try again after ${expirySeconds} seconds`,
            },
          );
        }

        return next();
      } catch (fallbackError) {
        // --- FAIL-OPEN STRATEGY ---
        // If even the in-memory check fails, log and call next() so users are not blocked
        logger.error(`In-memory rate limiter fallback error: ${fallbackError.message}. Failing open.`);
        return next();
      }
    }
  };
};

export default rateLimitMiddleware;
