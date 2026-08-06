import {Router }from "express" ;
// import {registration} from "../../controller/user/user.controller.js" ;
import registrationValidation from "../../validators/auth/registration.js" ;
const router = Router() ;

router.route("/register").post(registrationValidation) ;

export default router ;