"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import HistoryView from "./components/HistoryView";
import CreateWebsiteModal from "./components/CreateWebsiteModal";
import { FlowType } from "@/lib/types";

export default function App() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [websites, setWebsites] = useState([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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
            ] as any);
        }
    }, []);

    const handleDelete = (index: number) => {
        if (index === -1) return;
        const target = websites[index] as any;
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

    return (
        <div className="min-h-screen bg-white">
            <div className="fixed right-4 top-4 z-50">
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

            <HistoryView
                websites={websites as any}
                onOpenCreateModal={() => setIsModalOpen(true)}
                onDelete={handleDelete}
            />
            {isModalOpen && (
                <CreateWebsiteModal
                    onClose={() => setIsModalOpen(false)}
                    onSelectFlow={handleSelectFlow}
                />
            )}
        </div>
    );
}
