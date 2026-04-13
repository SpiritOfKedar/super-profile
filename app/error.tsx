"use client";

import { useEffect } from "react";
import { getErrorMessage, logError } from "@/lib/error-utils";

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        logError("app route error boundary", error);
    }, [error]);

    const details =
        process.env.NODE_ENV === "development"
            ? getErrorMessage(error, "Unexpected application error")
            : "Please refresh the page and try again.";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
            <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Application Error</p>
                <h1 className="mt-3 text-2xl font-black text-gray-900">Something went wrong</h1>
                <p className="mt-3 text-sm font-medium text-gray-600">{details}</p>
                <button
                    onClick={() => reset()}
                    className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
