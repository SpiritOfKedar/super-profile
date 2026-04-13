import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { apiError, badRequest, internalServerError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const requestedPath = formData.get("path") as string || "general";

        if (!file) {
            return badRequest("No file provided");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Clean filename and path
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "-");
        const cleanPath = requestedPath.replace(/[^a-zA-Z0-9/]/g, "-").replace(/\/+/g, "/");
        const fileName = `uploads/${cleanPath}/${Date.now()}-${cleanName}`;

        console.log("DEBUG: Uploading to bucket:", BUCKET_NAME);
        console.log("DEBUG: File name:", fileName);

        if (!BUCKET_NAME) {
            return apiError("S3 Bucket Name is not configured in .env", 500, "INTERNAL_ERROR");
        }

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
            // ACL: "public-read" - Removed as modern buckets often disable ACLs
        });

        await s3Client.send(command);

        // Construct the public URL with region fallback
        const region = process.env.AWS_REGION || "us-east-1";
        const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;

        return NextResponse.json({ url });
    } catch (error: unknown) {
        return internalServerError(error, "api/upload POST", "Upload failed");
    }
}
