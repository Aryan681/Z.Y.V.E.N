import { Router } from "express";
import authController from "../../controller/authController.js";
import {registrationSchema,resendVerificationSchema,loginSchema} from "../../validators/auth.validator.js";
import validate from "../../middlewares/validator.js";

const router = Router();

//registration & verificatoin routes
router.route("/register").post(validate(registrationSchema), authController.registration);
router.route("/verify").get(authController.verify);
router.route("/resend-verification").post(validate(resendVerificationSchema), authController.resendLink);

//login & logout routes 
router.route("/login").post(validate(loginSchema),authController.login);
router.route("/logout").post(validate(logoutSchema),authController.logout);

//password related routes
// router.route("/password-reset").post(validate( passwordResetSchema),authController.passwordReset);
// router.route("/forgot-password").post(validate( forgotPasswordSchema),authController.forgotPassword);
// router.route("/change-password").post(validate( changePasswordSchema),authController.changePassword);

//jwt related routes
//router.route("/refreshToken").post(validate(refreshTokenSchema)authController.refreshToken)

//google related routes
// router.route("/google-callback").post(authController.googleRegistration);

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
