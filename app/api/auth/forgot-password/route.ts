import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import { generateOtp, sendEmailOtp, verifyEmailOtp } from "@/lib/auth/email-otp";
import { findUserByEmail, normalizeEmail, updateUserPasswordHash } from "@/lib/auth/user-store";
import { isMongoUnavailable } from "@/lib/mongo-errors";

const MIN_PASSWORD_LENGTH = 8;

interface ForgotPasswordBody {
    email?: string;
    otp?: string;
    newPassword?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as ForgotPasswordBody;
        const email = normalizeEmail(body.email || "");
        const otp = body.otp?.trim() || "";
        const newPassword = body.newPassword || "";

        if (!email) {
            return badRequest("Email is required");
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return badRequest("No account found for this email");
        }

        if (!otp) {
            try {
                await sendEmailOtp(email, generateOtp());
                return NextResponse.json(
                    {
                        success: false,
                        requiresOtp: true,
                        message: "A recovery OTP has been sent to your email.",
                    },
                    { status: 202 }
                );
            } catch (error: unknown) {
                return externalServiceError("Failed to send OTP email. Please check email configuration.");
            }
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        if (!verifyEmailOtp(email, otp)) {
            return badRequest("Invalid OTP");
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        const updated = await updateUserPasswordHash(user.id, passwordHash);
        if (!updated) {
            return badRequest("Unable to update password");
        }

        return NextResponse.json({ success: true, message: "Password reset successful" });
    } catch (error: unknown) {
        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }
        return internalServerError(error, "api/auth/forgot-password POST", "Failed to reset password");
    }
}
