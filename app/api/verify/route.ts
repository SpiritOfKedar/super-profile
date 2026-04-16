import { NextRequest, NextResponse } from "next/server";
import { badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import { generateOtp, sendEmailOtp, verifyEmailOtp } from "@/lib/auth/email-otp";

export async function POST(req: NextRequest) {
    try {
        const { type, target } = await req.json();

        if (!target) {
            return badRequest("Target is required");
        }

        const otp = generateOtp();

        if (type === 'email') {
            try {
                await sendEmailOtp(target, otp);
                console.log(`[VERIFICATION] Email OTP sent to ${target}`);
            } catch (mailError: unknown) {
                console.error("Email sending error:", mailError);
                return externalServiceError("Failed to send email. Please check SMTP configuration.");
            }
        } else {
            console.log("[VERIFICATION] Phone OTP requested (SMS delivery not implemented).");
        }

        return NextResponse.json({
            success: true,
            message: `OTP sent successfully to ${target}.`
        });
    } catch (error: unknown) {
        return internalServerError(error, "api/verify POST", "Failed to send OTP");
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { target, otp } = await req.json();
        if (verifyEmailOtp(target, otp)) {
            return NextResponse.json({ success: true, verified: true });
        }

        return badRequest("Invalid OTP");
    } catch (error: unknown) {
        return internalServerError(error, "api/verify PUT", "Failed to verify OTP");
    }
}
