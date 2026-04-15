import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { badRequest, internalServerError } from "@/lib/api-error";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

function sanitizePathPart(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: "Unauthorized",
            code: "UNAUTHORIZED",
        },
        { status: 401 }
    );
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
        const session = token ? await verifySessionToken(token) : null;
        if (!session) {
            return unauthorizedResponse();
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const requestedPath = formData.get("path") as string || "general";

        if (!(file instanceof File)) {
            return badRequest("No file provided");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "-");
        const cleanPath = requestedPath.replace(/[^a-zA-Z0-9/]/g, "-").replace(/\/+/g, "/");
        const ownerScopedPath = `users/${sanitizePathPart(session.sub)}/${cleanPath}`;
        const publicId = `${Date.now()}-${cleanName.replace(/\.[^.]+$/, "")}`;

        const result = await uploadToCloudinary(buffer, {
            path: ownerScopedPath,
            publicId,
            resourceType: "auto",
        });

        return NextResponse.json({ url: result.secure_url });
    } catch (error: unknown) {
        return internalServerError(error, "api/upload POST", "Upload failed");
    }
}
