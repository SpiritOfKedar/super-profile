import { uploadAsset } from "@/lib/upload";

interface UploadWithOptimisticOptions {
    file: File;
    uploadKey: string;
    applyLocal: (localUrl: string) => void;
    applyRemote: (remoteUrl: string, localUrl: string) => void;
}

function resolveUploadPath(uploadKey: string, file: File): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const mediaType = file.type.startsWith("image/") ? "images" : "files";
    const key = uploadKey.replace(/[^a-zA-Z0-9/_-]/g, "-");
    return `builder/${mediaType}/${key}/${yyyy}/${mm}`;
}

export async function uploadWithOptimistic({
    file,
    uploadKey,
    applyLocal,
    applyRemote
}: UploadWithOptimisticOptions) {
    const localUrl = URL.createObjectURL(file);
    applyLocal(localUrl);

    const remoteUrl = await uploadAsset(file, resolveUploadPath(uploadKey, file));
    applyRemote(remoteUrl, localUrl);
}
