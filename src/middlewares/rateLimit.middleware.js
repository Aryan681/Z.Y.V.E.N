import rateLimitMiddleware from "../utils/rateLimiter.js";

const ratelimiter = {
  loginRateLimit: rateLimitMiddleware({
    key: "login",
    maxRequests: 5,
    expirySeconds: 60,
  }),
  registrationRateLimit: rateLimitMiddleware({
    key: "registration",
    maxRequests: 5,
    expirySeconds: 60,
  }),
  resendVerificationRateLimit: rateLimitMiddleware({
    key: "resendVerification",
    maxRequests: 3,
    expirySeconds: 60,
  }),

  refreshTokenRateLimit: rateLimitMiddleware({
    key: "refreshToken",
    maxRequests: 2,
    expirySeconds: 60,
  }),
  passwordResetRateLimit: rateLimitMiddleware({
    key: "passwordReset",
    maxRequests: 1,
    expirySeconds: 86400,
  }),
  forgotPasswordRateLimit: rateLimitMiddleware({
    key: "forgetPassword",
    maxRequests: 2,
    expirySeconds: 86400,
  }),
};
export default ratelimiter;
