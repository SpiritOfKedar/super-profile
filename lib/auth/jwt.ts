import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const DEV_FALLBACK_SECRET = "dev-only-auth-secret-change-me-before-production";

export interface SessionPayload extends JWTPayload {
    sub: string;
    email: string;
    name: string;
    username: string;
}

function getJwtSecret(): Uint8Array | null {
    const configured = process.env.AUTH_SECRET?.trim();

    if (configured) {
        return new TextEncoder().encode(configured);
    }

    if (process.env.NODE_ENV !== "production") {
        return new TextEncoder().encode(DEV_FALLBACK_SECRET);
    }

    return null;
}

export async function signSessionToken(input: {
    userId: string;
    email: string;
    name: string;
    username: string;
    expiresInSeconds: number;
}): Promise<string | null> {
    const secret = getJwtSecret();
    if (!secret) {
        return null;
    }

    return new SignJWT({
        email: input.email,
        name: input.name,
        username: input.username,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(input.userId)
        .setIssuedAt()
        .setExpirationTime(`${input.expiresInSeconds}s`)
        .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    const secret = getJwtSecret();
    if (!secret) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        const { sub, email, name, username } = payload;

        if (typeof sub !== "string" || typeof email !== "string" || typeof name !== "string") {
            return null;
        }

        const safeUsername = typeof username === "string" && username.trim()
            ? username
            : email.split("@")[0];

        return {
            ...payload,
            sub,
            email,
            name,
            username: safeUsername,
        } as SessionPayload;
    } catch {
        return null;
    }
}
