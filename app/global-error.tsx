"use client";

import { useEffect } from "react";
import { logError } from "@/lib/error-utils";

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        logError("app global error boundary", error);
    }, [error]);

    return (
        <html lang="en">
            <body className="min-h-screen bg-gray-900 text-white">
                <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Critical Error</p>
                    <h1 className="mt-4 text-3xl font-black tracking-tight">The application failed to load</h1>
                    <p className="mt-3 text-sm font-medium text-gray-300">
                        A critical error occurred while rendering this page. Please retry.
                    </p>
                    <div className="mt-8 flex items-center gap-3">
                        <button
                            onClick={() => reset()}
                            className="rounded-xl bg-white px-5 py-3 text-sm font-black text-gray-900 transition hover:bg-gray-200"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-xl border border-white/25 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
