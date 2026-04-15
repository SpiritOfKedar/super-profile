"use client";

import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { extractApiErrorMessage, getErrorMessage } from "@/lib/error-utils";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [needsOtp, setNeedsOtp] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setErrorMessage(null);
        setInfoMessage(null);

        if (needsOtp && newPassword !== confirmPassword) {
            setErrorMessage("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    otp: needsOtp ? otp : undefined,
                    newPassword: needsOtp ? newPassword : undefined,
                }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 202 && data?.requiresOtp) {
                setNeedsOtp(true);
                setInfoMessage(data?.message || "OTP sent to your email.");
                return;
            }

            if (!response.ok || !data?.success) {
                setErrorMessage(extractApiErrorMessage(data, "Unable to reset password"));
                return;
            }

            router.push("/login");
            router.refresh();
        } catch (error: unknown) {
            setErrorMessage(getErrorMessage(error, "Unable to reset password"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full">
            <div className="hidden lg:flex w-1/2 relative bg-gray-100 items-center justify-center">
                <div className="relative w-full h-full">
                    <Image
                        src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2690&auto=format&fit=crop"
                        alt="Forgot password"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
            </div>

            <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 md:px-16 lg:px-24 bg-white">
                <div className="max-w-md w-full mx-auto space-y-8">
                    <div className="text-center lg:text-left">
                        <h1 className={`${playfair.className} text-4xl font-bold tracking-tight text-gray-900`}>
                            Forgot Password
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Recover your account with email OTP.
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {errorMessage && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                {errorMessage}
                            </p>
                        )}
                        {infoMessage && (
                            <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                                {infoMessage}
                            </p>
                        )}

                        <div className="space-y-4">
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

                            {needsOtp && (
                                <>
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                            Enter OTP sent to your email
                                        </label>
                                        <input
                                            id="otp"
                                            name="otp"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={otp}
                                            onChange={(event) => setOtp(event.target.value)}
                                            required={needsOtp}
                                            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                            placeholder="Enter 4-digit OTP"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                                            New Password
                                        </label>
                                        <input
                                            id="new-password"
                                            name="new-password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            required={needsOtp}
                                            minLength={8}
                                            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                            placeholder="Create new password"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                            Re-enter Password
                                        </label>
                                        <input
                                            id="confirm-password"
                                            name="confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            required={needsOtp}
                                            minLength={8}
                                            className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                                            placeholder="Re-enter new password"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                            >
                                {isSubmitting ? "Please wait..." : needsOtp ? "Verify OTP & Reset" : "Send OTP"}
                            </button>
                        </div>
                    </form>

                    <p className="mt-2 text-center text-sm text-gray-600">
                        Remembered password?{" "}
                        <Link href="/login" className="font-medium text-black hover:underline">
                            Back to login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
