import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
    GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
    GOOGLE_OAUTH_NEXT_COOKIE_NAME,
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/auth/constants";
import { getSafeNextPath, resolveGoogleRedirectUri } from "@/lib/auth/google-oauth";

function redirectToLogin(req: NextRequest, errorCode: string, nextPath: string): NextResponse {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", errorCode);
    if (nextPath !== "/") {
        loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
}

export async function GET(req: NextRequest) {
    const nextPath = getSafeNextPath(req.nextUrl.searchParams.get("next"));
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const redirectUri = resolveGoogleRedirectUri(req);

    if (!clientId || !redirectUri) {
        return redirectToLogin(req, "google_config", nextPath);
    }

    const state = randomUUID();
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    const response = NextResponse.redirect(authUrl);
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set({
        name: GOOGLE_OAUTH_STATE_COOKIE_NAME,
        value: state,
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
    });

    response.cookies.set({
        name: GOOGLE_OAUTH_NEXT_COOKIE_NAME,
        value: nextPath,
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
}
