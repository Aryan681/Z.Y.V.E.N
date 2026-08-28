import logger from "../config/logger.js";
import defaults from "../constants/defaults.js";
import tokenService from "../services/token.service.js";
import responseHelper from "../utils/response.js";
import redisService from "../services/redis.service.js";
const authMiddleware = {
  extractToken: (req) => {
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");

      if (scheme === "Bearer" && token) {
        return {
          token,
          source: "header",
        };
      }
    }

    // 2. Check cookie
    const cookieToken = req.cookies?.accessToken;

    if (cookieToken) {
      return {
        token: cookieToken,
        source: "cookie",
      };
    }

    return null;
  },
  verifyToken:async (req, res, next) => {
    try {
      const tokenData = authMiddleware.extractToken(req);

      if (!tokenData) {
        return responseHelper.customResponse(
          res,
          defaults.UNAUTHORIZED_CODE,
          "Authentication failed",
          {
            error: "Unauthorized",
          },
        );
      }

      const { token } = tokenData;
      const decoded = tokenService.verifyAccessToken(token);
      const userLogoutTime = await redisService.get( `auth:logout:user:${decoded.sub}`);
      if (userLogoutTime && decoded.iat <= Number(userLogoutTime)) {
        return responseHelper.customResponse(
          res,
          defaults.UNAUTHORIZED_CODE,
          "Unauthorized",
          {error: "Session has been revoked"},
        );
      }
      const sessionLogOutTime = await redisService.get( `auth:logout:session:${decoded.sid}`);
      if (sessionLogOutTime && decoded.iat <= Number(sessionLogOutTime)) {
        return responseHelper.customResponse(
          res,
          defaults.UNAUTHORIZED_CODE,
          "Unauthorized",
          {error: "Session has been revoked"},
        );
      }
      req.user = decoded;

      next();
    } catch (error) {
      logger.error(`Error verifying access token ${error}`);

      return responseHelper.customResponse(
        res,
        defaults.UNAUTHORIZED_CODE,
        "Unauthorized",
        {
          error: error.message,
        },
      );
    }
  },
};

export default authMiddleware;
