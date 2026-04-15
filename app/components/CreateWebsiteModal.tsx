"use client";

import type { ReactNode } from "react";
import { X, Store, List, Book } from "lucide-react";
import { FlowType } from "@/lib/types";

interface CreateWebsiteModalProps {
    onClose: () => void;
    onSelectFlow: (flow: FlowType) => void;
}

export default function CreateWebsiteModal({ onClose, onSelectFlow }: CreateWebsiteModalProps) {
    const flows: { id: FlowType; title: string; sub: string; color: string; icon: ReactNode }[] = [
        { id: "digital", title: "Digital Product", sub: "Sell images, videos, or docs", color: "#E5FFE5", icon: <Store className="text-green-600" size={24} /> },
        { id: "list", title: "Product List", sub: "Showcase multiple items", color: "#FFE5FF", icon: <List className="text-pink-600" size={24} /> },
        { id: "existing", title: "Existing Tools", sub: "Connect your current stack", color: "#E5F1FF", icon: <Book className="text-blue-600" size={24} /> }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/5 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Create your<br />new website</h2>
                    <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-black rounded-full transition-all"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {flows.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => onSelectFlow(f.id)}
                            className="w-full group flex items-center gap-5 p-5 border border-gray-100 rounded-[28px] hover:border-black transition-all bg-[#FCFCFD] text-left active:scale-[0.98]"
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: f.color }}>
                                {f.icon}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[15px] font-black text-gray-900 mb-0.5">{f.title}</h4>
                                <p className="text-[12px] text-gray-400 font-bold leading-tight">{f.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
