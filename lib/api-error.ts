import "server-only";

import { NextResponse } from "next/server";
import { logError } from "@/lib/error-utils";

export type ApiErrorCode =
    | "BAD_REQUEST"
    | "NOT_FOUND"
    | "EXTERNAL_SERVICE_ERROR"
    | "INTERNAL_ERROR";

interface ApiErrorBody {
    success: false;
    error: string;
    code: ApiErrorCode;
}

export function apiError(message: string, status: number, code: ApiErrorCode): NextResponse<ApiErrorBody> {
    return NextResponse.json(
        {
            success: false,
            error: message,
            code,
        },
        { status }
    );
}

export function badRequest(message: string): NextResponse<ApiErrorBody> {
    return apiError(message, 400, "BAD_REQUEST");
}

export function notFound(message: string): NextResponse<ApiErrorBody> {
    return apiError(message, 404, "NOT_FOUND");
}

export function externalServiceError(message: string): NextResponse<ApiErrorBody> {
    return apiError(message, 502, "EXTERNAL_SERVICE_ERROR");
}

export function internalServerError(error: unknown, context: string, fallback = "Internal server error"): NextResponse<ApiErrorBody> {
    logError(context, error);
    return apiError(fallback, 500, "INTERNAL_ERROR");
}
