import { Router } from "express";
import authController from "../../controller/authController.js";
import {logoutSchema,registrationSchema,resendVerificationSchema,loginSchema,refreshTokenSchema, passwrodResetSchema,forgotPasswordSchema ,changeEmailSchema,changePasswordSchema ,changeEmailVerifySchema} from "../../validators/auth.validator.js";
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
router.route("/password-reset").post(ratelimiter.passwordResetRateLimit,authenticate.verifyToken,validate(passwrodResetSchema ),authController.passwordReset);
router.route("/forgot-password").post(ratelimiter.forgotPasswordRateLimit,validate( forgotPasswordSchema),authController.forgotPassword);
router.route("/reset-password").post(ratelimiter.passwordResetRateLimit,validate(changePasswordSchema ),authController.changePassword);

//email related routes
router.route("/change-email").post(ratelimiter.changeEmailRateLimit,authenticate.verifyToken,validate(changeEmailSchema ),authController.emailChange);
router.route("/change-email/verify").post(authenticate.verifyToken,validate(changeEmailVerifySchema ),authController.emailChangeVerify);

// logout & session management routes 
router.route("/logout").post(validate(logoutSchema), authenticate.verifyToken, authController.logout);
router.route("/sessions").get(ratelimiter.sessionsRateLimit,authenticate.verifyToken, authController.allSessions);
// router.route("/me").get(ratelimiter.userProfileRateLimit,authenticate.verifyToken, authController.getMe);

// 2FA / TOTP (Authenticator App) routes
router.route("/two-fa/setup").post(authenticate.verifyToken, authController.twofaSetup);
// router.route("/two-fa/enable").post(authenticate.verifyToken, validate(twofaOtpSchema), authController.twofaEnable);
// router.route("/two-fa/verify").post(validate(twofaLoginVerifySchema), authController.twofaVerify);
// router.route("/two-fa/disable").post(authenticate.verifyToken, validate(twofaOtpSchema), authController.twofaDisable);
// router.route("/two-fa/recovery-codes/generate").post(authenticate.verifyToken, authController.generateRecoveryCodes);
// router.route("/two-fa/recovery-codes/verify").post(validate(twofaRecoverySchema), authController.twofaRecoveryVerify);
//router.route("/two-fa/status").post(authenticate.verifyToken, authController.twofaStatus);

// Magic Link (Passwordless Email) routes
// router.route("/passwordless/send-link").post(ratelimiter.forgotPasswordRateLimit, validate(passwordlessSchema), authController.sendMagicLink);
// router.route("/passwordless/verify").get(authController.verifyMagicLink);

// Passkeys / WebAuthn (Biometrics & FIDO2) routes
// router.route("/passkey/register/options").post(authenticate.verifyToken, authController.passkeyRegisterOptions);
// router.route("/passkey/register/verify").post(authenticate.verifyToken, authController.passkeyRegisterVerify);
// router.route("/passkey/login/options").post(authController.passkeyLoginOptions);
// router.route("/passkey/login/verify").post(authController.passkeyLoginVerify);

// Team / Workspace invitation routes
// router.route("/invite").post(authenticate.verifyToken, validate(inviteUserSchema), authController.inviteUser);
// router.route("/invite-register").post(validate(inviteRegisterSchema), authController.inviteRegister);

// Account deletion & lifecycle routes
// router.route("/account").delete(authenticate.verifyToken, validate(deleteAccountSchema), authController.deleteAccount);

export default router;
