import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { apiError, badRequest, internalServerError } from "@/lib/api-error";

interface CreateOrderPayload {
    amount?: number | string;
    currency?: string;
    receipt?: string;
}

export async function POST(req: NextRequest) {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return apiError("Razorpay credentials are not configured.", 500, "INTERNAL_ERROR");
        }

        const payload = (await req.json()) as CreateOrderPayload;
        const amount = Number(payload?.amount);
        const currency = (payload?.currency || "INR").toUpperCase();
        const receipt = payload?.receipt?.trim();

        if (!amount || Number.isNaN(amount) || amount <= 0) {
            return badRequest("Valid amount is required");
        }

        if (!/^[A-Z]{3}$/.test(currency)) {
            return badRequest("Currency must be a valid 3-letter ISO code");
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const options = {
            amount: Math.round(amount * 100), // smallest currency unit (paise for INR)
            currency,
            receipt: receipt || `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json(order);
    } catch (error: unknown) {
        return internalServerError(error, "api/razorpay POST", "Failed to create order");
    }
}
