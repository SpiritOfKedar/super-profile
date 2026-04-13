import { uploadToS3 } from "@/lib/upload";

interface UploadWithOptimisticOptions {
    file: File;
    uploadKey: string;
    applyLocal: (localUrl: string) => void;
    applyRemote: (remoteUrl: string, localUrl: string) => void;
}

export async function uploadWithOptimistic({
    file,
    uploadKey,
    applyLocal,
    applyRemote
}: UploadWithOptimisticOptions) {
    const localUrl = URL.createObjectURL(file);
    applyLocal(localUrl);

    const remoteUrl = await uploadToS3(file, uploadKey);
    applyRemote(remoteUrl, localUrl);
}
