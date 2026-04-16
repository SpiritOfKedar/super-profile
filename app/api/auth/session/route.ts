import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
        return NextResponse.json({ authenticated: false });
    }

    const session = await verifySessionToken(token);
    if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
        authenticated: true,
        user: {
            id: session.sub,
            name: session.name,
            username: session.username,
            email: session.email,
        },
    });
}
