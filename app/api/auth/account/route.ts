import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { apiError, badRequest, externalServiceError, internalServerError } from "@/lib/api-error";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { deleteUserById, findUserById } from "@/lib/auth/user-store";
import { deleteUserCloudinaryAssets } from "@/lib/cloudinary";
import { getMongoDb } from "@/lib/mongodb";
import { isMongoUnavailable } from "@/lib/mongo-errors";

interface DeleteAccountBody {
    password?: string;
}

export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
        if (!token) {
            return apiError("Unauthorized", 401, "BAD_REQUEST");
        }

        const session = await verifySessionToken(token);
        if (!session) {
            return apiError("Unauthorized", 401, "BAD_REQUEST");
        }

        const body = (await req.json()) as DeleteAccountBody;
        const password = body.password || "";
        if (!password) {
            return badRequest("Password is required");
        }

        const user = await findUserById(session.sub);
        if (!user) {
            return apiError("User not found", 404, "NOT_FOUND");
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            return badRequest("Password is incorrect");
        }

        const db = await getMongoDb();
        await db.collection("websites").deleteMany({ ownerId: user.id });
        await deleteUserCloudinaryAssets(user.id);
        await deleteUserById(user.id);

        const response = NextResponse.json({ success: true });
        clearSessionCookie(response);
        return response;
    } catch (error: unknown) {
        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }
        return internalServerError(error, "api/auth/account DELETE", "Failed to delete account");
    }
}
