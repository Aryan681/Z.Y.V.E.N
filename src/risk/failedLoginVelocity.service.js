import crypto from "crypto";
import logger from "../config/logger.js";
import redisService from "../services/redis.service.js";
import riskConstants from "./risk.constants.js";

const keyPart = (value) =>
  crypto
    .createHash("sha256")
    .update(String(value || "").trim().toLowerCase())
    .digest("hex");

const getKeys = ({ email, ipAddress }) => [
  email ? `auth:failed-login:email:${keyPart(email)}` : null,
  ipAddress ? `auth:failed-login:ip:${keyPart(ipAddress)}` : null,
].filter(Boolean);

const failedLoginVelocityService = {
  recordFailedAttempt: async ({ email, ipAddress }) => {
    const keys = getKeys({ email, ipAddress });

    await Promise.all(
      keys.map((key) =>
        redisService.ratelimit(
          key,
          riskConstants.velocity.windowMinutes * 60,
        ),
      ),
    );
  },

  getVelocity: async ({ email, ipAddress }) => {
    try {
      const counts = await Promise.all(
        getKeys({ email, ipAddress }).map(async (key) =>
          Number.parseInt((await redisService.get(key)) || "0", 10),
        ),
      );

      return {
        count: Math.max(0, ...counts.filter(Number.isFinite)),
        degraded: false,
      };
    } catch (error) {
      logger.warn(`Failed-login velocity unavailable: ${error.message}`);
      return { count: 0, degraded: true };
    }
  },
};

export default failedLoginVelocityService;
