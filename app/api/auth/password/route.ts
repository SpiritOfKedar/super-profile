import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { apiError, badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { findUserById, updateUserPasswordHash } from "@/lib/auth/user-store";
import { isMongoUnavailable } from "@/lib/mongo-errors";

const MIN_PASSWORD_LENGTH = 8;

interface ChangePasswordBody {
    currentPassword?: string;
    newPassword?: string;
}

export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
        if (!token) {
            return apiError("Unauthorized", 401, "BAD_REQUEST");
        }

        const session = await verifySessionToken(token);
        if (!session) {
            return apiError("Unauthorized", 401, "BAD_REQUEST");
        }

        const body = (await req.json()) as ChangePasswordBody;
        const currentPassword = body.currentPassword || "";
        const newPassword = body.newPassword || "";

        if (!currentPassword || !newPassword) {
            return badRequest("Current and new password are required");
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }

        const user = await findUserById(session.sub);
        if (!user) {
            return apiError("User not found", 404, "NOT_FOUND");
        }

        const validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!validCurrent) {
            return badRequest("Current password is incorrect");
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await updateUserPasswordHash(user.id, passwordHash);

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (error: unknown) {
        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }
        return internalServerError(error, "api/auth/password PUT", "Failed to change password");
    }
}
