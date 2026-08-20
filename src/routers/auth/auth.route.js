import { Router } from "express";
import authController from "../../controller/authController.js";
import {registrationSchema,resendVerificationSchema,loginSchema,refreshTokenSchema, passwrodResetSchema,forgotPasswordSchema ,changePasswordSchema } from "../../validators/auth.validator.js";
import validate from "../../middlewares/validator.js";
import authenticate from "../../middlewares/auth.middleware.js";
import ratelimiter from "../../middlewares/rateLimit.middleware.js";

const router = Router();

//registration & verificatoin routes
router.route("/register").post(ratelimiter.registrationRateLimit,validate(registrationSchema), authController.registration);
router.route("/verify").get(authController.verify);
router.route("/resend-verification").post(ratelimiter.resendVerificationRateLimit,validate(resendVerificationSchema), authController.resendLink);

//login 
router.route("/login").post(ratelimiter.loginRateLimit,validate(loginSchema),authController.login);

//jwt related routes
router.route("/refreshToken").post(ratelimiter.refreshTokenRateLimit,validate(refreshTokenSchema),authController.rotateRefreshToken);

//google related routes
router.route("/google").get(authController.googleRegistration);
router.route("/google/callback").get(authController.googleCallback);
router.route("/google/link").get(authenticate.verifyToken,authController.googleLink);
router.route("/google/link/callback").get(authController.googleLinkCallback);


//password related routes
router.route("/password-reset").post(ratelimiter.passwordResetRateLimit,authenticate,validate(passwrodResetSchema ),authController.passwordReset);
router.route("/forgot-password").post(ratelimiter.forgotPasswordRateLimit,validate( forgotPasswordSchema),authController.forgotPassword);
router.route("/change-password").post(ratelimiter.passwordResetRateLimit,validate(changePasswordSchema ),authController.changePassword);

// logout routes 
// router.route("/logout").post(validate(logoutSchema),authController.logout);
// router.route("/logout/allDevices").post(validate(logoutSchema),authController.logoutAllDevices);
// router.route("/logout/specificDevice").post(validate(logoutSchema),authController.logoutSpecificDevice);
// router.route("/all-sessions").get(authController.allSessions);


//email related routes
// router.route("/change-email").post(authController.emailChange);

//custom register routes
// router.route("/invite-register").post(validate(inviteRegisterSchema)authController.inviteRegister);

//2fa related routes
// router.post("/two-fa/setup").post( authController.twofaSetup);
// router.post("/two-fa/enable").post( validate(twofaOtpSchema), authController.twofaEnable);
// router.post("/two-fa/verify").post( validate(twofaOtpSchema), authController.twofaVerify);
// router.post("/two-fa/resend").post( authController.twofaResend);
// router.delete("/two-fa/disable").post( validate(twofaOtpSchema), authController.twofaDisable);

export default router;
