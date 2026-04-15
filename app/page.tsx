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

    useEffect(() => {
        const rawData = localStorage.getItem('websites_list');
        if (rawData !== null) {
            setWebsites(JSON.parse(rawData));
        } else {
            // Default Demo Data
            setWebsites([
                {
                    title: "Project Alpha - Final Version",
                    price: "₹1,999",
                    sale: "12",
                    revenue: "₹23,988",
                    status: "Active",
                    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426",
                    lastModified: "12 mins ago",
                    type: "digital"
                },
                {
                    title: "Store - New Collection 2024",
                    price: "₹4,500",
                    sale: "5",
                    revenue: "₹22,500",
                    status: "Active",
                    image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=2371",
                    lastModified: "1 hour ago",
                    type: "list"
                },
                {
                    title: "Mastering React Component Patterns",
                    price: "₹899",
                    sale: "89",
                    revenue: "₹80,011",
                    status: "Draft",
                    image: "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?q=80&w=2422",
                    lastModified: "1 day ago",
                    type: "digital"
                },
                {
                    title: "Fitness & Nutrition Plan V2",
                    price: "₹4,999",
                    sale: "0",
                    revenue: "₹0",
                    status: "Draft",
                    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2370",
                    lastModified: "3 days ago",
                    type: "digital"
                }
            ] satisfies Website[]);
        }
    }, []);

    useEffect(() => {
        fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => {
                if (data?.authenticated && data?.user?.email) {
                    setUserEmail(data.user.email);
                }
            })
            .catch(() => undefined);
    }, []);

    const handleDelete = (index: number) => {
        if (index === -1) return;
        const target = websites[index];
        if (target && target.slug) {
            localStorage.removeItem(`website_${target.slug}`);
        }
        const newList = [...websites];
        newList.splice(index, 1);
        setWebsites(newList);
        localStorage.setItem('websites_list', JSON.stringify(newList));
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

            router.push("/signup");
            router.refresh();
        } finally {
            setIsDeletingAccount(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="fixed right-4 top-4 z-50">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-black shadow-lg transition-colors hover:bg-gray-100"
                    >
                        Settings
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg shadow-black/20 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
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
