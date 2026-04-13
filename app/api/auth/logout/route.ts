import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";

function createLogoutResponse(): NextResponse {
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
}

export async function POST() {
    return createLogoutResponse();
}
