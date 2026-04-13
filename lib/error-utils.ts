export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
    if (typeof error === "string" && error.trim()) {
        return error;
    }

    if (error && typeof error === "object") {
        const maybeError = error as { message?: unknown };
        if (typeof maybeError.message === "string" && maybeError.message.trim()) {
            return maybeError.message;
        }
    }

    return fallback;
}

export function extractApiErrorMessage(payload: unknown, fallback = "Request failed"): string {
    if (!payload || typeof payload !== "object") {
        return fallback;
    }

    const maybePayload = payload as {
        error?: unknown;
        message?: unknown;
        description?: unknown;
    };

    if (typeof maybePayload.error === "string" && maybePayload.error.trim()) {
        return maybePayload.error;
    }

    if (maybePayload.error && typeof maybePayload.error === "object") {
        const nestedError = maybePayload.error as { message?: unknown };
        if (typeof nestedError.message === "string" && nestedError.message.trim()) {
            return nestedError.message;
        }
    }

    if (typeof maybePayload.message === "string" && maybePayload.message.trim()) {
        return maybePayload.message;
    }

    if (typeof maybePayload.description === "string" && maybePayload.description.trim()) {
        return maybePayload.description;
    }

    return fallback;
}

export function logError(context: string, error: unknown): void {
    console.error(`[${context}]`, error);
}
