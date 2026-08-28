const defaults = {
 // Success
    OK_CODE : 200,
    CREATED_CODE : 201,
    NO_CONTENT_CODE : 204,
    // Client errors
    BAD_REQUEST_CODE : 400,
    UNAUTHORIZED_CODE : 401,
    FORBIDDEN_CODE : 403,
    NOT_FOUND_CODE : 404,
    CONFLICT_CODE : 409,
    UNPROCESSABLE_ENTITY_CODE : 422,
    TOO_MANY_REQUESTS_CODE : 429,
    // Server errors
    INTERNAL_SERVER_ERROR_CODE : 500,
    SERVICE_UNAVAILABLE_CODE : 503,

    SUCCESS_MESSAGE : "Success",
    ERROR_MESSAGE : "Error",
    SERVER_ERROR_MESSAGE : "Internal Server Error",
    INVALID_REQUEST_MESSAGE : "Invalid Request",
    NOT_FOUND_MESSAGE : "Not Found",
    SERVICE_UNAVAILABLE_MESSAGE : "Service Unavailable",

    BCRYPT_SALT_ROUNDS :10,
}
export default defaults ;