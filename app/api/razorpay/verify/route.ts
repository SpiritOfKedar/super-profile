import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, badRequest, internalServerError } from "@/lib/api-error";

interface VerifyPaymentPayload {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
}

export async function POST(req: NextRequest) {
    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            return apiError("Razorpay credentials are not configured.", 500, "INTERNAL_ERROR");
        }

        const payload = (await req.json()) as VerifyPaymentPayload;
        const orderId = payload?.razorpay_order_id?.trim();
        const paymentId = payload?.razorpay_payment_id?.trim();
        const signature = payload?.razorpay_signature?.trim();

        if (!orderId || !paymentId || !signature) {
            return badRequest("Missing payment verification fields");
        }

        const expectedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest("hex");

        if (expectedSignature !== signature) {
            return apiError("Payment signature mismatch", 400, "BAD_REQUEST");
        }

        return NextResponse.json({
            success: true,
            verified: true,
        });
    } catch (error: unknown) {
        return internalServerError(error, "api/razorpay/verify POST", "Failed to verify payment");
    }
}
