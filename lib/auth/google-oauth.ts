import { NextRequest } from "next/server";

const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export function getSafeNextPath(path: string | null | undefined): string {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
        return "/";
    }

    return path;
}

function normalizeRedirectUri(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return undefined;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        return undefined;
    }

    if (parsed.pathname !== GOOGLE_CALLBACK_PATH || parsed.search || parsed.hash) {
        return undefined;
    }

    return parsed.toString();
}

export function resolveGoogleRedirectUri(req: NextRequest): string | undefined {
    const configured = normalizeRedirectUri(process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "");
    if (configured) {
        return configured;
    }

    const fallback = new URL(GOOGLE_CALLBACK_PATH, req.url);
    return normalizeRedirectUri(fallback.toString());
}
