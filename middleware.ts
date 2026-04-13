import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

function getSafeRedirectPath(path: string | null): string {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
        return "/";
    }

    return path;
}

function requiresApiAuth(req: NextRequest): boolean {
    const { pathname } = req.nextUrl;

    if (pathname === "/api/upload") {
        return true;
    }

    if (pathname === "/api/websites" && req.method !== "GET") {
        return true;
    }

    return false;
}

function unauthorizedApiResponse(): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: "Unauthorized",
            code: "UNAUTHORIZED",
        },
        { status: 401 }
    );
}

export async function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;
    const isProtectedPage = pathname === "/" || pathname.startsWith("/builder");
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const isProtectedApi = requiresApiAuth(req);

    if (!isProtectedPage && !isAuthPage && !isProtectedApi) {
        return NextResponse.next();
    }

    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (isAuthPage && session) {
        const nextPath = getSafeRedirectPath(req.nextUrl.searchParams.get("next"));
        return NextResponse.redirect(new URL(nextPath, req.url));
    }

    if (session) {
        return NextResponse.next();
    }

    if (isProtectedApi) {
        return unauthorizedApiResponse();
    }

    if (isProtectedPage) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/builder/:path*", "/login", "/signup", "/api/upload", "/api/websites"],
};
