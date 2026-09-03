import { OTP } from "otplib";
import { z } from "zod";

export const registrationSchema =  z.object({
    name: z.string().min(3, {message: "Name must be at least 3 characters long"}).max(50, {message: "Name must be at most 50 characters long"}).trim(),
    email: z.string().trim().toLowerCase().email({message: "Invalid email address"}),
    password: z.string().min(8, {message: "Password must be at least 8 characters long"}).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"}),
}) ;

export const resendVerificationSchema = z.object({
    email: z.string().trim().toLowerCase().email({message: "Invalid email address"}),
});
export const loginSchema =z.object({
    email: z.string().trim().toLowerCase().email({message: "Invalid email address"}),
    password: z.string().min(8, {message: "Password must be at least 8 characters long"}).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"}),
    deviceId: z.string().uuid("Invalid device ID"),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().trim({message: "Invalid refresh token"}),
});

export const passwrodResetSchema = z.object({
    oldPassword: z.string().min(8, {message: "Password must be at least 8 characters long"}).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"}),
    newPassword: z.string().min(8, {message: "Password must be at least 8 characters long"}).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"}),
});
export const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email({message: "Invalid email address"}),
});
export const changePasswordSchema = z.object({
    newPassword: z.string().min(8, {message: "Password must be at least 8 characters long"}).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"}),
});
export const changeEmailSchema = z.object({
    email: z.string().trim().toLowerCase().email({message: "Invalid email address"}),
});
export const changeEmailVerifySchema = z.object({
    old_code: z.string().trim().min(1, {message: "Old email verification code is required"}),
    new_code: z.string().trim().min(1, {message: "New email verification code is required"}),
});
export const logoutSchema  = z.object({
    scope: z.string().min(1, {message: "Scope is required"}),
    session_id: z.string().uuid("Invalid session ID"),
    current_session_id: z.string().uuid("Invalid current session ID"),
})
export const twofaOtpSchema = z.object({
    otp: z.string().trim().regex(/^\d{6}$/, {message: "OTP must be exactly 6 digits"}),

}); 
export const twofaVerifySchema = z.object({
    otp: z.string().trim().regex(/^\d{6}$/, {message: "OTP must be exactly 6 digits"}),
    token: z.string().trim().min(1, {message: "2FA token is required"}),
    deviceId: z.string().uuid("Invalid device ID"),
});
export const deleteAccountSchema = z.object({
    reason: z.string().trim().min(1, {message: "Reason for account deletion is required"}).max(500, {message: "Reason for account deletion must be at most 500 characters long"}),
});
