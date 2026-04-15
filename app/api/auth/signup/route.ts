import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { apiError, badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import { DEFAULT_SESSION_DURATION_SECONDS } from "@/lib/auth/constants";
import { setSessionCookie } from "@/lib/auth/cookies";
import { signSessionToken } from "@/lib/auth/jwt";
import { isMongoUnavailable } from "@/lib/mongo-errors";
import {
    createUserRecord,
    findUserByEmail,
    normalizeEmail,
    toPublicUser,
} from "@/lib/auth/user-store";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupBody {
    name?: string;
    email?: string;
    password?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as SignupBody;
        const name = body.name?.trim() || "";
        const email = body.email?.trim() || "";
        const password = body.password || "";

        if (!name) {
            return badRequest("Name is required");
        }

        if (!EMAIL_REGEX.test(email)) {
            return badRequest("A valid email is required");
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await findUserByEmail(normalizedEmail);
        if (existingUser) {
            return apiError("An account with this email already exists", 409, "BAD_REQUEST");
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await createUserRecord({
            name,
            email: normalizedEmail,
            passwordHash,
        });

        const token = await signSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
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

        if (maybeError.message === "MONGODB_URI_MISSING") {
            return apiError("MONGODB_URI is missing. Set MONGODB_URI in your environment.", 500, "INTERNAL_ERROR");
        }

        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }

        return internalServerError(error, "api/auth/signup POST", "Failed to create account");
    }
}
