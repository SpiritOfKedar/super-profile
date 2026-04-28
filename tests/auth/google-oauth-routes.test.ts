import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    GOOGLE_OAUTH_NEXT_COOKIE_NAME,
    GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/auth/constants";

const findUserByEmail = vi.fn();
const findUserByUsername = vi.fn();
const createUserRecord = vi.fn();
const signSessionToken = vi.fn();
const setSessionCookie = vi.fn();
const bcryptHash = vi.fn();

vi.mock("bcryptjs", () => ({
    default: {
        hash: bcryptHash,
    },
}));

vi.mock("@/lib/auth/jwt", () => ({
    signSessionToken,
}));

vi.mock("@/lib/auth/cookies", () => ({
    setSessionCookie,
}));

vi.mock("@/lib/auth/user-store", () => ({
    findUserByEmail,
    findUserByUsername,
    createUserRecord,
    normalizeEmail: (email: string) => email.trim().toLowerCase(),
    normalizeUsername: (username: string) => username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_"),
}));

function makeRequest(url: string): NextRequest {
    return new NextRequest(url, { method: "GET" });
}

describe("google oauth routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        process.env.GOOGLE_CLIENT_ID = "test-client";
        process.env.GOOGLE_CLIENT_SECRET = "test-secret";
        process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
    });

    it("sets oauth state/next cookies and redirects to google auth", async () => {
        const { GET } = await import("@/app/api/auth/google/start/route");
        const response = await GET(makeRequest("http://localhost:3000/api/auth/google/start?next=/dashboard"));
        const location = response.headers.get("location");

        expect(location).toContain("accounts.google.com");
        expect(response.cookies.get(GOOGLE_OAUTH_NEXT_COOKIE_NAME)?.value).toBe("/dashboard");
        expect(response.cookies.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value).toBeTruthy();
    });

    it("returns google_config error when configured redirect uri is invalid", async () => {
        process.env.GOOGLE_OAUTH_REDIRECT_URI = "not-a-valid-uri";
        const { GET } = await import("@/app/api/auth/google/start/route");
        const response = await GET(makeRequest("http://localhost:3000/api/auth/google/start"));
        const location = response.headers.get("location");

        expect(location).toContain("/login");
        expect(location).toContain("error=google_config");
    });

    it("rejects callback when oauth state does not match and clears oauth cookies", async () => {
        const { GET } = await import("@/app/api/auth/google/callback/route");
        const request = makeRequest("http://localhost:3000/api/auth/google/callback?code=abc&state=bad");
        request.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, "expected");
        request.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE_NAME, "/checkout");

        const response = await GET(request);
        const location = response.headers.get("location");
        const setCookies = response.headers.getSetCookie();

        expect(location).toContain("/login");
        expect(location).toContain("error=google_state");
        expect(setCookies.join(";")).toContain(`${GOOGLE_OAUTH_STATE_COOKIE_NAME}=`);
        expect(setCookies.join(";")).toContain(`${GOOGLE_OAUTH_NEXT_COOKIE_NAME}=`);
    });

    it("creates session and redirects to next path on successful callback", async () => {
        findUserByEmail.mockResolvedValue(undefined);
        findUserByUsername.mockResolvedValue(undefined);
        createUserRecord.mockResolvedValue({
            id: "u_1",
            email: "john@example.com",
            name: "John",
            username: "john",
            createdAt: new Date().toISOString(),
            passwordHash: "x",
        });
        bcryptHash.mockResolvedValue("hashed");
        signSessionToken.mockResolvedValue("session-token");
        setSessionCookie.mockImplementation(() => {});

        const fetchMock = vi.fn();
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: "access-token" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    email: "john@example.com",
                    email_verified: true,
                    name: "John",
                }),
            });
        vi.stubGlobal("fetch", fetchMock);

        const { GET } = await import("@/app/api/auth/google/callback/route");
        const request = makeRequest("http://localhost:3000/api/auth/google/callback?code=abc&state=expected");
        request.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, "expected");
        request.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE_NAME, "/dashboard");

        const response = await GET(request);
        const location = response.headers.get("location");

        expect(location).toBe("http://localhost:3000/dashboard");
        expect(createUserRecord).toHaveBeenCalledOnce();
        expect(signSessionToken).toHaveBeenCalledOnce();
        expect(setSessionCookie).toHaveBeenCalledOnce();
    });
});
