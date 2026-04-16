import type { FormData } from "@/lib/types";

export function readStringArrayField(fd: FormData, field: string): string[] {
    const raw = (fd as unknown as Record<string, unknown>)[field];
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is string => typeof item === "string");
}
