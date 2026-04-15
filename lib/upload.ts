import { extractApiErrorMessage } from "@/lib/error-utils";

export async function uploadAsset(file: File, path: string = "general"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(extractApiErrorMessage(errorPayload, "Upload failed"));
    }

    const data = await response.json();
    return data.url;
}

// Backward-compatible alias for older call sites.
export const uploadToS3 = uploadAsset;
