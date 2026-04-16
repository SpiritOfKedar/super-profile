import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, internalServerError } from "@/lib/api-error";

function timingSafeEqualHex(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, "utf8");
    const bBuffer = Buffer.from(b, "utf8");
    if (aBuffer.length !== bBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function POST(req: NextRequest) {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return apiError("Razorpay webhook secret is not configured.", 500, "INTERNAL_ERROR");
        }

        const signature = req.headers.get("x-razorpay-signature");
        if (!signature) {
            return apiError("Missing webhook signature", 400, "BAD_REQUEST");
        }

        const rawBody = await req.text();
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("hex");

        if (!timingSafeEqualHex(expectedSignature, signature)) {
            return apiError("Invalid webhook signature", 400, "BAD_REQUEST");
        }

        const event = JSON.parse(rawBody) as { event?: string };
        // TODO: persist webhook events in DB once payment records are added.
        console.log("[razorpay webhook] received event:", event?.event || "unknown");

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return internalServerError(error, "api/razorpay/webhook POST", "Failed to process webhook");
    }
}
