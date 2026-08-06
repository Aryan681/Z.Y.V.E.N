import {z} from "zod" ;
import responseHelper from "../../utils/response.js" ;

    const registrationSchema =  z.object({
            name: z.string().min(3, {message: "Name must be at least 3 characters long"}).max(50, {message: "Name must be at most 50 characters long"}).trim(),
            email: z.string().trim().toLowerCase().email({message: "Invalid email address"}),
            password: z.string().min(8, {message: "Password must be at least 8 characters long"}).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"}),
        }) ;
        
    const registrationValidation = (req, res, next) => {
        const result = registrationSchema.safeParse(req.body);
        if (!result.success) {
            return responseHelper.customResponse(
            res, 400, "Validation failed", {errors: result.error.errors});
        }
        req.body = result.data;
        next();
    };

export default registrationValidation;