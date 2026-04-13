import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { apiError, badRequest, internalServerError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
    try {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return apiError("Razorpay credentials are not configured.", 500, "INTERNAL_ERROR");
        }

        const { amount, currency, receipt } = await req.json();

        if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
            return badRequest("Valid amount is required");
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const options = {
            amount: Math.round(Number(amount) * 100), // amount in the smallest currency unit (paise)
            currency: currency || "INR",
            receipt: receipt || "receipt_" + Math.random().toString(36).substring(7),
        };

        console.log("Creating Razorpay Order with options:", options);
        const order = await razorpay.orders.create(options);

        return NextResponse.json(order);
    } catch (error: unknown) {
        return internalServerError(error, "api/razorpay POST", "Failed to create order");
    }
}
