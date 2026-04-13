import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
    DEFAULT_SESSION_DURATION_SECONDS,
    GOOGLE_OAUTH_NEXT_COOKIE_NAME,
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { setSessionCookie } from "@/lib/auth/cookies";
import { signSessionToken } from "@/lib/auth/jwt";
import { createUserRecord, findUserByEmail, normalizeEmail } from "@/lib/auth/user-store";

interface GoogleTokenResponse {
    access_token?: string;
}

interface GoogleUserInfoResponse {
    email?: string;
    name?: string;
    email_verified?: boolean;
}

function getSafeNextPath(path: string | null): string {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
        return "/";
    }

    return path;
}

function getGoogleRedirectUri(req: NextRequest): string {
    const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
    if (configured) {
        return configured;
    }

    return new URL("/api/auth/google/callback", req.url).toString();
}

function clearGoogleOauthCookies(response: NextResponse): void {
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set({
        name: GOOGLE_OAUTH_STATE_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
    });

    response.cookies.set({
        name: GOOGLE_OAUTH_NEXT_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
    });
}

function redirectToLogin(req: NextRequest, errorCode: string, nextPath: string): NextResponse {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", errorCode);
    if (nextPath !== "/") {
        loginUrl.searchParams.set("next", nextPath);
    }

    const response = NextResponse.redirect(loginUrl);
    clearGoogleOauthCookies(response);
    return response;
}

export async function GET(req: NextRequest) {
    const nextPath = getSafeNextPath(req.cookies.get(GOOGLE_OAUTH_NEXT_COOKIE_NAME)?.value ?? "/");

    const oauthError = req.nextUrl.searchParams.get("error");
    if (oauthError) {
        return redirectToLogin(req, "google_denied", nextPath);
    }

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const expectedState = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value;

    if (!code || !state || !expectedState || state !== expectedState) {
        return redirectToLogin(req, "google_state", nextPath);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
        return redirectToLogin(req, "google_config", nextPath);
    }

    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: getGoogleRedirectUri(req),
                grant_type: "authorization_code",
            }).toString(),
            cache: "no-store",
        });

        const tokenPayload = (await tokenResponse.json().catch(() => null)) as GoogleTokenResponse | null;
        if (!tokenResponse.ok || !tokenPayload?.access_token) {
            return redirectToLogin(req, "google_callback", nextPath);
        }

        const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: {
                Authorization: `Bearer ${tokenPayload.access_token}`,
            },
            cache: "no-store",
        });

        const profile = (await userInfoResponse.json().catch(() => null)) as GoogleUserInfoResponse | null;
        if (!userInfoResponse.ok || !profile?.email || !profile.email_verified) {
            return redirectToLogin(req, "google_email", nextPath);
        }

        const normalizedEmail = normalizeEmail(profile.email);
        let user = await findUserByEmail(normalizedEmail);

        if (!user) {
            const fallbackName = normalizedEmail.split("@")[0] || "User";
            const name = profile.name?.trim() || fallbackName;
            const passwordHash = await bcrypt.hash(randomUUID(), 12);

            try {
                user = await createUserRecord({
                    name,
                    email: normalizedEmail,
                    passwordHash,
                });
            } catch (error: unknown) {
                const maybeError = error as { message?: string };

                if (maybeError.message === "USER_EXISTS") {
                    user = await findUserByEmail(normalizedEmail);
                } else {
                    throw error;
                }
            }
        }

        if (!user) {
            return redirectToLogin(req, "google_callback", nextPath);
        }

        const sessionToken = await signSessionToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            expiresInSeconds: DEFAULT_SESSION_DURATION_SECONDS,
        });

        if (!sessionToken) {
            return redirectToLogin(req, "auth_config", nextPath);
        }

        const response = NextResponse.redirect(new URL(nextPath, req.url));
        setSessionCookie(response, sessionToken, DEFAULT_SESSION_DURATION_SECONDS);
        clearGoogleOauthCookies(response);
        return response;
    } catch {
        return redirectToLogin(req, "google_callback", nextPath);
    }
}
