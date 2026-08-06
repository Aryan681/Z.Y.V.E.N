const responseHelper = {

customResponse: (res, statusCode, message, data) => {
        return res.status(statusCode).json({
            message: message,
            data: data
        });
    }
}
export default responseHelper ;
