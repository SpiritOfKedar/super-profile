import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { apiError, badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import {
    DEFAULT_SESSION_DURATION_SECONDS,
    REMEMBER_ME_SESSION_DURATION_SECONDS,
} from "@/lib/auth/constants";
import { setSessionCookie } from "@/lib/auth/cookies";
import { signSessionToken } from "@/lib/auth/jwt";
import { isMongoUnavailable } from "@/lib/mongo-errors";
import { findUserByEmail, normalizeEmail, toPublicUser } from "@/lib/auth/user-store";

interface LoginBody {
    email?: string;
    password?: string;
    rememberMe?: boolean;
}

function unauthorized(): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: "Invalid email or password",
            code: "UNAUTHORIZED",
        },
        { status: 401 }
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as LoginBody;
        const email = body.email?.trim() || "";
        const password = body.password || "";
        const rememberMe = Boolean(body.rememberMe);

        if (!email || !password) {
            return badRequest("Email and password are required");
        }

        const user = await findUserByEmail(normalizeEmail(email));
        if (!user) {
            return unauthorized();
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return unauthorized();
        }

        const maxAge = rememberMe
            ? REMEMBER_ME_SESSION_DURATION_SECONDS
            : DEFAULT_SESSION_DURATION_SECONDS;

        const token = await signSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            expiresInSeconds: maxAge,
        });

        if (!token) {
            return apiError("AUTH_SECRET is missing. Set AUTH_SECRET in your environment.", 500, "INTERNAL_ERROR");
        }

        const response = NextResponse.json({
            success: true,
            user: toPublicUser(user),
        });

        setSessionCookie(response, token, maxAge);
        return response;
    } catch (error: unknown) {
        const maybeError = error as { message?: string };
        if (maybeError.message === "MONGODB_URI_MISSING") {
            return apiError("MONGODB_URI is missing. Set MONGODB_URI in your environment.", 500, "INTERNAL_ERROR");
        }

        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }

        return internalServerError(error, "api/auth/login POST", "Failed to sign in");
    }
}
