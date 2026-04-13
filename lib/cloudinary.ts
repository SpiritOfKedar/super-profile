import { UploadApiOptions, v2 as cloudinary } from "cloudinary";

const BASE_UPLOAD_FOLDER = "super-profile/uploads";

interface UploadToCloudinaryOptions {
    path?: string;
    publicId?: string;
    resourceType?: UploadApiOptions["resource_type"];
    overwrite?: boolean;
}

let isConfigured = false;

interface CloudinaryUploadResult {
    secure_url: string;
}

function ensureCloudinaryConfigured() {
    if (isConfigured) {
        return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("CLOUDINARY_CONFIG_MISSING");
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });

    isConfigured = true;
}

function cleanFolderPath(pathValue?: string): string {
    const rawPath = (pathValue || "general").trim();

    return rawPath
        .replace(/[^a-zA-Z0-9/_-]/g, "-")
        .replace(/\/+/g, "/")
        .replace(/^\/+|\/+$/g, "") || "general";
}

export async function uploadToCloudinary(
    buffer: Buffer,
    options: UploadToCloudinaryOptions = {}
): Promise<CloudinaryUploadResult> {
    ensureCloudinaryConfigured();

    const cleanPath = cleanFolderPath(options.path);
    const folder = `${BASE_UPLOAD_FOLDER}/${cleanPath}`;

    const uploadOptions: UploadApiOptions = {
        folder,
        resource_type: options.resourceType ?? "auto",
        overwrite: options.overwrite ?? false,
        public_id: options.publicId,
    };

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error || !result) {
                reject(error || new Error("CLOUDINARY_UPLOAD_FAILED"));
                return;
            }

            if (!result.secure_url) {
                reject(new Error("CLOUDINARY_SECURE_URL_MISSING"));
                return;
            }

            resolve({ secure_url: result.secure_url });
        });

        stream.end(buffer);
    });
}