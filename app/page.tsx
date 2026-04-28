"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import HistoryView from "./components/HistoryView";
import CreateWebsiteModal from "./components/CreateWebsiteModal";
import { FlowType, Website } from "@/lib/types";
import { extractApiErrorMessage } from "@/lib/error-utils";

export default function App() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [websites, setWebsites] = useState<Website[]>([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    const clearLocalUserData = () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (
                key === "websites_list"
                || key === "builder_draft"
                || key === "sp_active_user"
                || key.startsWith("website_")
                || key.startsWith("websites_list_")
                || key.startsWith("builder_draft_")
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    };

    useEffect(() => {
        fetch("/api/websites")
            .then(async (res) => {
                if (res.status === 401) {
                    router.push("/login");
                    return [];
                }
                return res.json();
            })
            .then((data) => {
                if (Array.isArray(data)) {
                    setWebsites(data as Website[]);
                } else {
                    setWebsites([]);
                }
            })
            .catch(() => setWebsites([]));
    }, []);

    useEffect(() => {
        fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => {
                if (data?.authenticated && data?.user?.email) {
                    setUserEmail(data.user.email);
                }
                if (data?.authenticated && data?.user?.username) {
                    localStorage.setItem("sp_active_user", data.user.username);
                }
            })
            .catch(() => undefined);
    }, []);

    const handleDelete = async (index: number) => {
        if (index === -1) return;
        const target = websites[index];
        if (!target?.slug) return;
        const response = await fetch("/api/websites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: target.slug }),
        });
        if (!response.ok) {
            alert("Failed to delete website from server.");
            return;
        }
        const newList = [...websites];
        newList.splice(index, 1);
        setWebsites(newList);
        localStorage.removeItem(`website_${target.slug}`);
        if (target.ownerUsername) {
            localStorage.removeItem(`website_${target.ownerUsername}_${target.slug}`);
        }
    };

    const handleSelectFlow = (id: FlowType) => {
        setIsModalOpen(false);
        router.push(`/builder/${id}`);
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
            localStorage.removeItem("sp_active_user");
        } finally {
            router.push("/login");
            router.refresh();
            setIsLoggingOut(false);
        }
    };

    const handleChangePassword = async () => {
        setSettingsError(null);
        setSettingsSuccess(null);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setSettingsError("All password fields are required");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setSettingsError("New password and confirmation must match");
            return;
        }

        setIsChangingPassword(true);
        try {
            const response = await fetch("/api/auth/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) {
                setSettingsError(extractApiErrorMessage(data, "Unable to update password"));
                return;
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setSettingsSuccess("Password updated successfully");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        setSettingsError(null);
        setSettingsSuccess(null);

        if (!deletePassword) {
            setSettingsError("Enter your password to delete account");
            return;
        }

        setIsDeletingAccount(true);
        try {
            const response = await fetch("/api/auth/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: deletePassword }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) {
                setSettingsError(extractApiErrorMessage(data, "Unable to delete account"));
                return;
            }

            clearLocalUserData();
            router.push("/signup");
            router.refresh();
        } finally {
            setIsDeletingAccount(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="fixed inset-x-3 top-3 z-50 sm:inset-x-auto sm:right-4 sm:top-4">
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black shadow-lg transition-colors hover:bg-gray-100 sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-[0.16em]"
                    >
                        Settings
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-black/20 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-[0.16em]"
                    >
                        <LogOut size={14} />
                        {isLoggingOut ? "Logging Out..." : "Logout"}
                    </button>
                </div>
            </div>

            <HistoryView
                websites={websites}
                onOpenCreateModal={() => setIsModalOpen(true)}
                onDelete={handleDelete}
            />
            {isModalOpen && (
                <CreateWebsiteModal
                    onClose={() => setIsModalOpen(false)}
                    onSelectFlow={handleSelectFlow}
                />
            )}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsSettingsOpen(false)}
                    />
                    <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Account Settings</h2>
                                <p className="text-sm text-gray-500">{userEmail || "Signed in user"}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSettingsOpen(false)}
                                className="rounded-full px-3 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>

                        {settingsError && (
                            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                {settingsError}
                            </p>
                        )}
                        {settingsSuccess && (
                            <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                                {settingsSuccess}
                            </p>
                        )}

                        <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
                            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-800">Change Password</h3>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(event) => setCurrentPassword(event.target.value)}
                                placeholder="Current password"
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                placeholder="New password"
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                            <input
                                type="password"
                                value={confirmNewPassword}
                                onChange={(event) => setConfirmNewPassword(event.target.value)}
                                placeholder="Re-enter new password"
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleChangePassword}
                                disabled={isChangingPassword}
                                className="w-full rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
                            >
                                {isChangingPassword ? "Updating..." : "Update Password"}
                            </button>
                        </div>

                        <div className="mt-4 space-y-3 rounded-2xl border border-red-200 p-4">
                            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-red-700">Delete Account</h3>
                            <p className="text-xs text-gray-500">This action is permanent and cannot be undone.</p>
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                placeholder="Enter password to confirm"
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="w-full rounded-full bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                            >
                                {isDeletingAccount ? "Deleting..." : "Delete My Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
