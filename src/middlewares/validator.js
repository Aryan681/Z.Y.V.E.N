import responseHelper from "../utils/response.js";

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return responseHelper.customResponse(res, 400, "Validation failed", {
        errors: result.error.issues,
      });
    }
    req.body = result.data;
    next();
  };
};

export default validate;
