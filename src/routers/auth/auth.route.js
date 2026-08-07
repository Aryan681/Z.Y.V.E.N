import {Router }from "express" ;
import authController from "../../controller/authController.js";
import { registrationSchema,resendVerificationSchema } from "../../validators/auth.validator.js";
import validate from "../../middlewares/validator.js";
const router = Router() ;

router.route("/register").post(validate(registrationSchema),authController.registration) ;
router.route("/verify").get(authController.verify);
router.route("/resend/verficationLink").post(validate(resendVerificationSchema),authController.resendLink)

export default router ;