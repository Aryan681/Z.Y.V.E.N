import {Router }from "express" ;
import authController from "../../controller/authController.js";
import registrationValidation from "../../validators/auth/registration.js" ;
const router = Router() ;

router.route("/register").post(registrationValidation,authController.registration) ;
router.route("/verify").get(authController.verify);

export default router ;