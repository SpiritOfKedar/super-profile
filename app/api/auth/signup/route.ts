import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { apiError, badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import { DEFAULT_SESSION_DURATION_SECONDS } from "@/lib/auth/constants";
import { setSessionCookie } from "@/lib/auth/cookies";
import { generateOtp, sendEmailOtp, verifyEmailOtp } from "@/lib/auth/email-otp";
import { signSessionToken } from "@/lib/auth/jwt";
import { isMongoUnavailable } from "@/lib/mongo-errors";
import {
    createUserRecord,
    findUserByEmail,
    normalizeEmail,
    normalizeUsername,
    findUserByUsername,
    toPublicUser,
} from "@/lib/auth/user-store";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupBody {
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    otp?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as SignupBody;
        const name = body.name?.trim() || "";
        const username = normalizeUsername(body.username || "");
        const email = body.email?.trim() || "";
        const password = body.password || "";
        const otp = body.otp?.trim() || "";

        if (!name) {
            return badRequest("Name is required");
        }

        if (!EMAIL_REGEX.test(email)) {
            return badRequest("A valid email is required");
        }

        if (!username || username.length < 3) {
            return badRequest("Username must be at least 3 characters");
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        const normalizedEmail = normalizeEmail(email);
        if (!otp) {
            const existingUser = await findUserByEmail(normalizedEmail);
            if (existingUser) {
                return apiError("An account with this email already exists", 409, "BAD_REQUEST");
            }
            const existingUsername = await findUserByUsername(username);
            if (existingUsername) {
                return apiError("This username is already taken", 409, "BAD_REQUEST");
            }

            try {
                await sendEmailOtp(normalizedEmail, generateOtp());
                return NextResponse.json(
                    {
                        success: false,
                        requiresOtp: true,
                        message: "A verification code has been sent to your email.",
                    },
                    { status: 202 }
                );
            } catch (mailError: unknown) {
                return externalServiceError("Failed to send OTP email. Please check email configuration.");
            }
        }

        if (!verifyEmailOtp(normalizedEmail, otp)) {
            return badRequest("Invalid OTP");
        }

        const existingUser = await findUserByEmail(normalizedEmail);
        if (existingUser) {
            return apiError("An account with this email already exists", 409, "BAD_REQUEST");
        }
        const existingUsername = await findUserByUsername(username);
        if (existingUsername) {
            return apiError("This username is already taken", 409, "BAD_REQUEST");
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await createUserRecord({
            name,
            username,
            email: normalizedEmail,
            passwordHash,
        });

        const token = await signSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            expiresInSeconds: DEFAULT_SESSION_DURATION_SECONDS,
        });

        if (!token) {
            return apiError("AUTH_SECRET is missing. Set AUTH_SECRET in your environment.", 500, "INTERNAL_ERROR");
        }

        const response = NextResponse.json(
            {
                success: true,
                user: toPublicUser(user),
            },
            { status: 201 }
        );

        setSessionCookie(response, token, DEFAULT_SESSION_DURATION_SECONDS);
        return response;
    } catch (error: unknown) {
        const maybeError = error as { message?: string };
        if (maybeError.message === "USER_EXISTS") {
            return apiError("An account with this email already exists", 409, "BAD_REQUEST");
        }
        if (maybeError.message === "USERNAME_EXISTS") {
            return apiError("This username is already taken", 409, "BAD_REQUEST");
        }

        if (maybeError.message === "MONGODB_URI_MISSING") {
            return apiError("MONGODB_URI is missing. Set MONGODB_URI in your environment.", 500, "INTERNAL_ERROR");
        }

        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }

        return internalServerError(error, "api/auth/signup POST", "Failed to create account");
    }
}
