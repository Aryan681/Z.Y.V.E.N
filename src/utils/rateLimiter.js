import redisService from "../services/redis.service.js";
import logger from "../config/logger.js";
import responseHelper from "../utils/response.js";
import defaults from "../constants/defaults.js";

const rateLimitMiddleware = ({ key, maxRequests, expirySeconds }) => {
  return async (req, res, next) => {
    try {
      const ipAddress = req.ip;
      const redisKey = `${key}:${ipAddress}`;
      const currentRequests = await redisService.ratelimit( redisKey,expirySeconds );
      if (currentRequests > maxRequests) {
        logger.warn(`$ Rate limit exceeded for ip: ${ ipAddress }`);
        return responseHelper.customResponse(
          res,
          defaults.TOO_MANY_REQUESTS_CODE,
          "Too many requests",
          {
            error: `Too many requests. Please try again after ${expirySeconds} seconds`,
          },
        );
      }
      next();
    } catch (error) {
      logger.error(`${ error }, "Rate limit middleware error"`);

      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: error.message,
        },
      );
    }
  };
};

export default rateLimitMiddleware;
