import "server-only";

import nodemailer from "nodemailer";
import { normalizeEmail } from "@/lib/auth/user-store";

const otpStore = new Map<string, string>();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

function buildEmailOtpHtml(otp: string): string {
    return `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Verification Code</h2>
            <p>Use the code below to verify your email address:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px; background: #f4f4f4; display: inline-block;">
                ${otp}
            </div>
            <p>This code will expire shortly.</p>
        </div>
    `;
}

export function generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function sendEmailOtp(email: string, otp: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    otpStore.set(normalizedEmail, otp);

    await transporter.sendMail({
        from: `"SuperProfile Verification" <${process.env.EMAIL_USER}>`,
        to: normalizedEmail,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}`,
        html: buildEmailOtpHtml(otp),
    });
}

export function verifyEmailOtp(email: string, otp: string): boolean {
    const normalizedEmail = normalizeEmail(email);
    const expectedOtp = otpStore.get(normalizedEmail);

    if (!expectedOtp || expectedOtp !== otp.trim()) {
        return false;
    }

    otpStore.delete(normalizedEmail);
    return true;
}
