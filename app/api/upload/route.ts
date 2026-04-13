import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { badRequest, internalServerError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");
        const requestedPath = formData.get("path") as string || "general";

        if (!(file instanceof File)) {
            return badRequest("No file provided");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "-");
        const cleanPath = requestedPath.replace(/[^a-zA-Z0-9/]/g, "-").replace(/\/+/g, "/");
        const publicId = `${Date.now()}-${cleanName.replace(/\.[^.]+$/, "")}`;

        const result = await uploadToCloudinary(buffer, {
            path: cleanPath,
            publicId,
            resourceType: "auto",
        });

        return NextResponse.json({ url: result.secure_url });
    } catch (error: unknown) {
        return internalServerError(error, "api/upload POST", "Upload failed");
    }
}
