"use client";

import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { extractApiErrorMessage, getErrorMessage } from "@/lib/error-utils";

const playfair = Playfair_Display({ subsets: ["latin"] });

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    google_config: "Google sign-in is not configured yet. Add Google OAuth keys in .env.",
    google_denied: "Google sign-in was cancelled.",
    google_state: "Google sign-in session expired. Please try again.",
    google_email: "Google account email is unavailable or not verified.",
    google_callback: "Could not complete Google sign-in. Please try again.",
    auth_config: "Server auth configuration is incomplete.",
};

function getSafeNextPath(path: string | null): string {
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
        return "/";
    }

    return path;
}

export default function SignupPage() {
    const router = useRouter();
    const [redirectPath, setRedirectPath] = useState("/");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setRedirectPath(getSafeNextPath(params.get("next")));

        const errorCode = params.get("error");
        if (errorCode && OAUTH_ERROR_MESSAGES[errorCode]) {
            setErrorMessage(OAUTH_ERROR_MESSAGES[errorCode]);
        }
    }, []);

    const handleGoogleContinue = () => {
        const next = encodeURIComponent(redirectPath);
        window.location.href = `/api/auth/google/start?next=${next}`;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) {
                setErrorMessage(extractApiErrorMessage(data, "Unable to create account"));
                return;
            }

            router.push(redirectPath);
            router.refresh();
        } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, "Unable to create account"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full">
            {/* Left Side - Image */}
            <div className="hidden lg:flex w-1/2 relative bg-gray-100 items-center justify-center">
                <div className="relative w-full h-full">
                    {/* Placeholder for the design image - distinct from login */}
                    <Image
                        src="https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2690&auto=format&fit=crop"
                        alt="Art Signup"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 md:px-16 lg:px-24 bg-white">
                <div className="max-w-md w-full mx-auto space-y-8">
                    <div className="text-center lg:text-left">
                        <h1 className={`${playfair.className} text-4xl font-bold tracking-tight text-gray-900`}>
                            Create an account
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Join ArtEcommerce today.
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {errorMessage && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                {errorMessage}
                            </p>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    minLength={8}
                                    className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                    placeholder="Create a password"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                            >
                                {isSubmitting ? "Creating Account..." : "Sign Up"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={handleGoogleContinue}
                                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-full shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </button>
                        </div>
                    </div>

                    <p className="mt-2 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-black hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
