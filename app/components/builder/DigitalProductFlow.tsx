"use client";

import {
    X, ChevronDown, Check, Laptop, Smartphone, Copy, Globe, Edit3, Palette, Users, ImageIcon,
    Upload, Bold, Italic, Underline, AlignLeft, MoreHorizontal, HelpCircle, Info, Layout, Store,
    Instagram, Twitter, Settings, Shield, Mail, Phone, ExternalLink, Eye, RefreshCw, GripVertical, Plus, ArrowRight
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { FormData } from "@/lib/types";
import DevicePreview from "./DevicePreview";
import { uploadToS3 } from "@/lib/upload";
import { extractApiErrorMessage, getErrorMessage, logError } from "@/lib/error-utils";

interface DigitalProductFlowProps {
    formData: FormData;
    setFormData: (data: any) => void;
    step: number;
    onNext: () => void;
    onBack: () => void;
    onCancel: () => void;
    isLive: boolean;
    setIsLive: (val: boolean) => void;
    type?: string;
}

export default function DigitalProductFlow({
    formData, setFormData, step, onNext, onBack, onCancel, isLive, setIsLive
}: DigitalProductFlowProps) {
    const [device, setDevice] = useState<"laptop" | "phone">("laptop");
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [activeStyleTab, setActiveStyleTab] = useState<"Backgrounds" | "Buttons" | "Images">("Backgrounds");
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishingStep, setPublishingStep] = useState(0);
    const [tempCoverLink, setTempCoverLink] = useState("");
    const [tempTestimonialLink, setTempTestimonialLink] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [currentHost, setCurrentHost] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentHost(window.location.origin);
        }
    }, []);

    const handlePublish = async () => {
        setIsPublishing(true);
        const steps = ["Optimizing images...", "Generating SEO tags...", "Configuring custom domain...", "Securing checkout flows...", "Pushing to global CDN..."];

        for (let i = 0; i < steps.length; i++) {
            setPublishingStep(i);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // SAVE DATA FOR PERSISTENCE
        const slug = formData.customPageUrl || formData.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || "my-website";
        localStorage.setItem(`website_${slug}`, JSON.stringify(formData));

        // Update Dashboard List
        const existingList = JSON.parse(localStorage.getItem('websites_list') || '[]');
        const websiteEntry = {
            title: formData.title || "Untitled Website",
            price: `₹${formData.price || "0"}`,
            sale: "0",
            revenue: "₹0",
            status: "Active",
            image: formData.coverImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426",
            lastModified: "Just now",
            slug: slug,
            type: "digital"
        };

        const updatedList = [websiteEntry, ...existingList.filter((site: any) => site.slug !== slug)];
        localStorage.setItem('websites_list', JSON.stringify(updatedList));

        // SYNC TO S3 FOR SEARCH OPTIMIZATION
        try {
            const response = await fetch('/api/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData, websiteEntry })
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null);
                throw new Error(extractApiErrorMessage(errorPayload, "Failed to sync website index."));
            }
        } catch (err) {
            logError("digital flow publish sync", err);
        }

        setIsPublishing(false);
        setIsLive(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, isArray: boolean = false) => {
        const file = e.target.files?.[0];
        if (file) {
            // Optimistic Update: Show local image immediately
            const localUrl = URL.createObjectURL(file);
            if (isArray) {
                const currentArr = (formData as any)[field] || [];
                setFormData({ ...formData, [field]: [...currentArr, localUrl] });
            } else {
                setFormData({ ...formData, [field]: localUrl });
            }

            setIsUploading(true);
            try {
                const s3Url = await uploadToS3(file, field);
                // Replace local URL with S3 URL
                setFormData((prev: FormData) => {
                    if (isArray) {
                        const currentArr = (prev as any)[field] || [];
                        return { ...prev, [field]: currentArr.map((url: string) => url === localUrl ? s3Url : url) };
                    } else {
                        return { ...prev, [field]: s3Url };
                    }
                });
            } catch (err) {
                logError("digital flow file upload", err);
                alert(getErrorMessage(err, "Failed to upload image. Please check your S3 configuration."));
                // Revert to placeholder or remove broken local link if desired
            } finally {
                setIsUploading(false);
            }
        }
    };

    const addFAQ = () => {
        const currentFAQs = formData.faqs || [];
        setFormData({ ...formData, faqs: [...currentFAQs, { question: "", answer: "" }] });
    };

    const updateFAQ = (index: number, field: "question" | "answer", value: string) => {
        const newFAQs = [...(formData.faqs || [])];
        newFAQs[index] = { ...newFAQs[index], [field]: value };
        setFormData({ ...formData, faqs: newFAQs });
    };

    const removeFAQ = (index: number) => {
        const newFAQs = (formData.faqs || []).filter((_, i) => i !== index);
        setFormData({ ...formData, faqs: newFAQs });
    };

    const addProduct = () => {
        const currentProducts = formData.products || [];
        setFormData({
            ...formData,
            products: [...currentProducts, { id: Math.random().toString(36).substr(2, 9), title: "", description: "", price: "", image: "" }]
        });
    };

    const updateProduct = (id: string, field: string, value: any) => {
        const newProducts = (formData.products || []).map(p =>
            p.id === id ? { ...p, [field]: value } : p
        );
        setFormData({ ...formData, products: newProducts });
    };

    const removeProduct = (id: string) => {
        const newProducts = (formData.products || []).filter(p => p.id !== id);
        setFormData({ ...formData, products: newProducts });
    };

    const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const file = e.target.files?.[0];
        if (file) {
            // Optimistic Update
            const localUrl = URL.createObjectURL(file);
            updateProduct(id, 'image', localUrl);

            setIsUploading(true);
            try {
                const s3Url = await uploadToS3(file, 'products');
                updateProduct(id, 'image', s3Url);
            } catch (err) {
                logError("digital flow product image upload", err);
                alert(getErrorMessage(err, "Failed to upload image."));
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] overflow-hidden font-sans">
            {/* Main Preview Area */}
            <div className={`flex-1 flex flex-col items-center justify-center p-12 bg-gray-100/50 relative ${isUploading ? 'cursor-wait' : ''}`}>
                <div className="absolute top-8 left-8 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-white shadow-sm z-50">
                    {isUploading ? (
                        <>
                            <RefreshCw className="animate-spin text-blue-500" size={10} />
                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Uploading to S3...</span>
                        </>
                    ) : (
                        <span className="text-[10px] font-black uppercase text-gray-400">Preview Mode</span>
                    )}
                </div>

                <div className="absolute top-8 right-8 flex bg-white rounded-xl shadow-sm p-1 border border-gray-100 z-10">
                    <button onClick={() => setDevice("laptop")} className={`p-2 rounded-lg transition-all ${device === "laptop" ? "bg-gray-100 text-black shadow-inner" : "text-gray-400"}`}><Laptop size={16} /></button>
                    <button onClick={() => setDevice("phone")} className={`p-2 rounded-lg transition-all ${device === "phone" ? "bg-gray-100 text-black shadow-inner" : "text-gray-400"}`}><Smartphone size={16} /></button>
                </div>

                <DevicePreview device={device}>
                    <div
                        className={`flex-1 flex flex-col items-center text-center h-full py-16 px-8 overflow-y-auto scrollbar-hide relative transition-all duration-700 ${formData.themeId === 'tech' ? 'bg-[#0F172A] text-white' :
                            formData.themeId === 'dawn' ? 'bg-[#FFF7ED]' :
                                formData.themeId === 'dusk' ? 'bg-[#1E1B4B]' :
                                    formData.themeId === 'modern' ? (formData.darkTheme ? 'bg-[#111111] text-white' : 'bg-[#FAFAFA]') :
                                        formData.themeId === 'glass' ? (formData.darkTheme ? 'bg-[#0A0A0A] text-white' : 'bg-indigo-50/10') :
                                            (formData.darkTheme ? 'bg-[#121212] text-white' : 'bg-white')
                            }`}
                        style={{
                            backgroundImage: formData.customBgImage ? `linear-gradient(rgba(${formData.darkTheme || formData.themeId === 'tech' || formData.themeId === 'dusk' ? '0,0,0' : '255,255,255'}, 0.8), rgba(${formData.darkTheme || formData.themeId === 'tech' || formData.themeId === 'dusk' ? '0,0,0' : '255,255,255'}, 0.8)), url(${formData.customBgImage})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            fontFamily: formData.themeId === 'tech' ? "'Space Mono', monospace" : "inherit",
                            color: (formData.darkTheme || formData.themeId === 'tech' || formData.themeId === 'dusk') ? '#F8FAFC' : '#1A1A1A'
                        }}
                    >
                        <div className="flex flex-col items-center w-full space-y-12 min-h-full">
                            {/* Hero */}
                            <div className="space-y-10 flex flex-col items-center w-full animate-in fade-in duration-1000">
                                {formData.coverImage && (
                                    <div className="w-full aspect-video rounded-[40px] overflow-hidden border border-gray-100 shadow-2xl animate-in zoom-in-95 duration-700">
                                        <img src={formData.coverImage} className="w-full h-full object-cover" alt="Cover" />
                                    </div>
                                )}
                                <div className="space-y-8 flex flex-col items-center text-center">
                                    <h2 className={`${device === 'laptop' ? 'text-[40px]' : 'text-[28px]'} font-black leading-[1.1] max-w-lg ${formData.themeId === 'tech' ? 'tracking-tighter' : 'tracking-tight'} break-words`}>
                                        {formData.title || "Your Premium Product"}
                                    </h2>
                                    <p className={`text-[15px] md:text-lg font-bold max-w-md ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'text-gray-400' : 'text-gray-500'} opacity-70 break-words whitespace-pre-wrap`}>
                                        {formData.description || "Share the story of your digital product and why it's worth it."}
                                    </p>
                                    <button
                                        className="px-14 py-5 rounded-[24px] text-[15px] font-black shadow-2xl transition-all active:scale-95 hover:scale-[1.02]"
                                        style={{
                                            backgroundColor: formData.buttonColor || '#000000',
                                            color: formData.buttonTextColor || '#FFFFFF',
                                            border: formData.themeId === 'tech' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                                        }}
                                    >
                                        <span className="flex items-center gap-2">
                                            {formData.cta || "Get Instant Access"} <ArrowRight size={18} />
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Gallery Section Preview */}
                            {formData.galleryTitle && (
                                <div className="w-full pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-black text-left mb-4">{formData.galleryTitle}</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(formData.galleryImages && formData.galleryImages.length > 0) ? formData.galleryImages.map((img, i) => (
                                            <div key={i} className="aspect-square bg-gray-50/5 rounded-[20px] border border-gray-100/10 overflow-hidden">
                                                <img src={img} className="w-full h-full object-cover transition-transform hover:scale-110 duration-500" />
                                            </div>
                                        )) : (
                                            <div className="col-span-2 aspect-video bg-gray-50/5 rounded-[24px] border border-gray-100/10 flex items-center justify-center">
                                                <ImageIcon size={40} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Testimonial Preview */}
                            {formData.testimonialName && (
                                <div className="w-full pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className={`border p-8 rounded-[32px] shadow-sm flex flex-col items-center space-y-4 ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                            {formData.testimonialImage ? <img src={formData.testimonialImage} className="w-full h-full object-cover" /> : <Users size={24} className="text-gray-300" />}
                                        </div>
                                        <p className={`font-bold italic leading-relaxed text-[15px] ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'text-gray-300' : 'text-gray-600'} break-words whitespace-pre-wrap`}>"{formData.testimonialComment || "No comment yet"}"</p>
                                        <p className="font-black text-[14px] break-words">— {formData.testimonialName}</p>
                                    </div>
                                </div>
                            )}

                            {/* FAQ Preview */}
                            {formData.faqs && formData.faqs.length > 0 && (
                                <div className="w-full pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-black text-left mb-6">Frequently Asked Questions</h3>
                                    <div className="space-y-4">
                                        {formData.faqs.map((faq, i) => (
                                            <div key={i} className={`p-6 border rounded-[20px] text-left shadow-sm ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                                                <p className="font-black mb-2 break-words">{faq.question || `Question ${i + 1}`}</p>
                                                <p className={`font-medium text-[13px] ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'text-gray-400' : 'text-gray-500'} break-words whitespace-pre-wrap`}>{faq.answer || "Answer will appear here..."}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* About Us Preview */}
                            {formData.aboutUs && (
                                <div className="w-full pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-black text-left mb-4">About Us</h3>
                                    <p className={`text-left leading-relaxed text-[14px] ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'text-gray-400' : 'text-gray-500'} break-words whitespace-pre-wrap`}>{formData.aboutUs}</p>
                                </div>
                            )}

                            {/* Show Product Preview */}
                            {formData.showProduct && (
                                <div className="w-full pt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {(formData.products && formData.products.length > 0) ? (
                                        formData.products.map((product) => (
                                            <div key={product.id} className={`border rounded-[32px] overflow-hidden shadow-sm ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                                <div className="aspect-video w-full bg-gray-200">
                                                    {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Store size={40} /></div>}
                                                </div>
                                                <div className="p-8 text-left space-y-3">
                                                    <h3 className="text-xl font-black break-words">{product.title || "Product Name"}</h3>
                                                    <p className={`text-[13px] font-medium leading-relaxed ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'text-gray-400' : 'text-gray-500'} break-words whitespace-pre-wrap`}>{product.description || "Product description will appear here..."}</p>
                                                    <div className="flex items-center justify-between pt-4">
                                                        <span className="text-lg font-black">₹{product.price || "0"}</span>
                                                        <button
                                                            className="px-6 py-2.5 rounded-full text-[11px] font-black transition-transform active:scale-95"
                                                            style={{ backgroundColor: formData.buttonColor || '#000000', color: formData.buttonTextColor || '#FFFFFF' }}
                                                        >
                                                            Buy Now
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        /* BACKWARD COMPATIBILITY / DEFAULT STATE */
                                        <div className={`border rounded-[32px] overflow-hidden shadow-sm ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="aspect-video w-full bg-gray-200">
                                                {formData.productImage ? <img src={formData.productImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><Store size={40} /></div>}
                                            </div>
                                            <div className="p-8 text-left space-y-3">
                                                <h3 className="text-xl font-black break-words">{formData.productTitle || "Product Name"}</h3>
                                                <p className={`text-[13px] font-medium leading-relaxed ${formData.themeId === 'tech' || formData.themeId === 'dusk' ? 'text-gray-400' : 'text-gray-500'} break-words whitespace-pre-wrap`}>{formData.productDescription || "Product description will appear here..."}</p>
                                                <div className="flex items-center justify-between pt-4">
                                                    <span className="text-lg font-black">₹{formData.price || "0"}</span>
                                                    <button
                                                        className="px-6 py-2.5 rounded-full text-[11px] font-black"
                                                        style={{ backgroundColor: formData.buttonColor || '#000000', color: formData.buttonTextColor || '#FFFFFF' }}
                                                    >
                                                        Buy Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer Preview */}
                            {(formData.footerText || formData.socialInstagram || formData.socialTwitter) && (
                                <div className="w-full pt-16 pb-8 border-t border-gray-50/10 flex flex-col items-center space-y-6 animate-in fade-in duration-700">
                                    <div className="flex gap-4">
                                        {formData.socialInstagram && <div className="p-3 bg-white/5 border border-white/10 rounded-full text-pink-500 hover:scale-110 transition-transform cursor-pointer shadow-sm"><Instagram size={18} /></div>}
                                        {formData.socialTwitter && <div className="p-3 bg-white/5 border border-white/10 rounded-full text-blue-400 hover:scale-110 transition-transform cursor-pointer shadow-sm"><Twitter size={18} /></div>}
                                    </div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{formData.footerText || "© 2024 Your Brand"}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DevicePreview>
            </div>

            {/* Sidebar Form */}
            <div className="w-[580px] bg-white border-l border-gray-100 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
                <header className="px-10 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <X size={20} className="text-gray-400 cursor-pointer hover:text-black transition-colors" onClick={onCancel} />
                        <span className="text-[13px] font-bold text-gray-900">New Page</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex gap-1.5 items-center">
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${step >= i ? "bg-black" : "bg-gray-200"}`} />
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Step {step} - {step === 1 ? "Step Details" : step === 2 ? "Payment Page" : "Advanced Settings"}</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 scrollbar-hide">
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <h1 className="text-[26px] font-black tracking-tight text-gray-900">Tell us about your Website Page</h1>

                            {/* Website Page Title */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Website Page Title</label>
                                    <span className="text-[11px] font-bold text-gray-300">28/60</span>
                                </div>
                                <input
                                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:border-black transition-all placeholder:text-gray-300 shadow-sm"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Website Page Title"
                                />
                            </div>

                            {/* Cover Image Section */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Cover Image</label>
                                <div className="border border-gray-100 rounded-[28px] p-8 space-y-6 bg-[#FCFCFD] shadow-inner relative overflow-hidden">
                                    {formData.coverImage ? (
                                        <div className="relative group rounded-2xl overflow-hidden aspect-video border border-gray-100">
                                            <img src={formData.coverImage} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-full text-[11px] font-black">
                                                    Change Image
                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'coverImage')} />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                                <input
                                                    className="flex-1 px-4 py-2.5 text-[13px] font-bold outline-none placeholder:text-gray-300"
                                                    placeholder="Add the link"
                                                    value={tempCoverLink}
                                                    onChange={(e) => setTempCoverLink(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && tempCoverLink) {
                                                            setFormData({ ...formData, coverImage: tempCoverLink });
                                                            setTempCoverLink("");
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (tempCoverLink) {
                                                            setFormData({ ...formData, coverImage: tempCoverLink });
                                                            setTempCoverLink("");
                                                        }
                                                    }}
                                                    className="px-5 py-2.5 bg-[#F1F3F5] hover:bg-black hover:text-white rounded-xl text-[11px] font-black transition-all"
                                                >
                                                    Add Link
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-[1px] flex-1 bg-gray-100" />
                                                <span className="text-[11px] font-black text-gray-300">Or</span>
                                                <div className="h-[1px] flex-1 bg-gray-100" />
                                            </div>
                                            <label className="flex flex-col items-center justify-center py-4 group cursor-pointer">
                                                <Upload size={24} className="text-gray-300 group-hover:text-black transition-colors mb-2" />
                                                <span className="text-[13px] font-black text-gray-900">Upload Image</span>
                                                <p className="text-[10px] font-bold text-gray-400 mt-1">Recommending 1250px x 1204 or up to 10 mb</p>
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'coverImage')} />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Description Section */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Description</label>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    <textarea
                                        className="w-full h-40 px-5 py-5 text-[14px] font-bold outline-none resize-none placeholder:text-gray-200"
                                        placeholder="Start typing..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Primary CTA */}
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Primary CTA</label>
                                <input
                                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm"
                                    value={formData.cta}
                                    onChange={e => setFormData({ ...formData, cta: e.target.value })}
                                />
                            </div>

                            {/* Optional Sections */}
                            <div className="space-y-4 pt-4">
                                <label className="text-[14px] font-black text-gray-900">Optional Sections</label>
                                <div className="space-y-3">
                                    {[
                                        { id: "gallery", icon: <ImageIcon size={18} />, label: "Gallery" },
                                        { id: "testimonial", icon: <Users size={18} />, label: "Testimonial" },
                                        { id: "faq", icon: <HelpCircle size={18} />, label: "FAQ" },
                                        { id: "aboutUs", icon: <Info size={18} />, label: "About Us" },
                                        { id: "showProduct", icon: <Store size={18} />, label: "Show Product" },
                                        { id: "footer", icon: <Layout size={18} />, label: "Footer" }
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-4">
                                            <div
                                                onClick={() => setExpandedSection(expandedSection === item.id ? null : item.id)}
                                                className={`flex items-center justify-between p-5 border rounded-[20px] bg-white transition-all cursor-pointer shadow-sm group ${expandedSection === item.id ? 'border-black' : 'border-gray-100 hover:border-gray-200'}`}
                                            >
                                                <div className="flex items-center gap-4 text-gray-900">
                                                    <div className={`transition-transform ${expandedSection === item.id ? 'scale-110 text-black' : 'text-gray-900'}`}>{item.icon}</div>
                                                    <span className={`text-[13px] font-bold ${expandedSection === item.id ? 'text-black' : ''}`}>{item.label}</span>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${expandedSection === item.id ? 'rotate-180 text-black' : ''}`} />
                                            </div>

                                            {expandedSection === item.id && (
                                                <div className="p-6 bg-[#FCFCFD] border border-gray-100 rounded-[24px] space-y-6 animate-in slide-in-from-top-2 duration-300 shadow-inner">
                                                    {item.id === "gallery" && (
                                                        <div className="space-y-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Gallery Title</label>
                                                                <input
                                                                    className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                                    placeholder="Enter gallery title"
                                                                    value={formData.galleryTitle || ""}
                                                                    onChange={e => setFormData({ ...formData, galleryTitle: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Gallery Images</label>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {formData.galleryImages?.map((img, i) => (
                                                                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-100 relative group">
                                                                            <img src={img} className="w-full h-full object-cover" />
                                                                            <button
                                                                                onClick={() => setFormData({ ...formData, galleryImages: formData.galleryImages?.filter((_, idx) => idx !== i) })}
                                                                                className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <X size={10} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <label className="aspect-square border-2 border-dashed border-gray-100 rounded-lg flex flex-col items-center justify-center bg-white group cursor-pointer hover:border-black transition-colors">
                                                                        <Upload size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'galleryImages', true)} />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.id === "testimonial" && (
                                                        <div className="space-y-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {formData.testimonialImage ? <img src={formData.testimonialImage} className="w-full h-full object-cover" /> : <Users size={20} className="text-gray-200" />}
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="cursor-pointer px-4 py-2 bg-white border border-gray-100 rounded-full text-[11px] font-black hover:bg-gray-50 transition-all">
                                                                            Upload
                                                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'testimonialImage')} />
                                                                        </label>
                                                                        <span className="text-[10px] font-bold text-gray-300">or</span>
                                                                        <input
                                                                            className="flex-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:border-black transition-all"
                                                                            placeholder="Paste image link"
                                                                            value={tempTestimonialLink}
                                                                            onChange={(e) => setTempTestimonialLink(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' && tempTestimonialLink) {
                                                                                    setFormData({ ...formData, testimonialImage: tempTestimonialLink });
                                                                                    setTempTestimonialLink("");
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Name</label>
                                                                <input
                                                                    className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                                    placeholder="Name of the person"
                                                                    value={formData.testimonialName || ""}
                                                                    onChange={e => setFormData({ ...formData, testimonialName: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Comment</label>
                                                                <textarea
                                                                    className="w-full h-24 px-5 py-4 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm resize-none"
                                                                    placeholder="Write their testimonial..."
                                                                    value={formData.testimonialComment || ""}
                                                                    onChange={e => setFormData({ ...formData, testimonialComment: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.id === "faq" && (
                                                        <div className="space-y-6">
                                                            {(formData.faqs || []).map((faq, index) => (
                                                                <div key={index} className="space-y-4 p-5 bg-white border border-gray-100 rounded-[20px] relative group">
                                                                    <button
                                                                        onClick={() => removeFAQ(index)}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Question {index + 1}</label>
                                                                        <input
                                                                            className="w-full px-4 py-3 bg-[#F8F9FA] border border-gray-50 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all"
                                                                            placeholder="Type your question"
                                                                            value={faq.question}
                                                                            onChange={e => updateFAQ(index, 'question', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Answer</label>
                                                                        <textarea
                                                                            className="w-full h-24 px-4 py-3 bg-[#F8F9FA] border border-gray-50 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all resize-none"
                                                                            placeholder="Type your answer"
                                                                            value={faq.answer}
                                                                            onChange={e => updateFAQ(index, 'answer', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={addFAQ}
                                                                className="w-full py-4 border-2 border-dashed border-gray-100 rounded-[20px] text-[13px] font-black text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Plus size={16} /> Add New Question
                                                            </button>
                                                        </div>
                                                    )}

                                                    {item.id === "aboutUs" && (
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">About Us Description</label>
                                                            <textarea
                                                                className="w-full h-32 px-5 py-4 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm resize-none"
                                                                placeholder="Tell your story..."
                                                                value={formData.aboutUs || ""}
                                                                onChange={e => setFormData({ ...formData, aboutUs: e.target.value })}
                                                            />
                                                        </div>
                                                    )}

                                                    {item.id === "showProduct" && (
                                                        <div className="space-y-6">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[13px] font-bold text-gray-900">Show Products on Page</span>
                                                                <div
                                                                    onClick={() => setFormData({ ...formData, showProduct: !formData.showProduct })}
                                                                    className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${formData.showProduct ? 'bg-black' : 'bg-gray-200'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.showProduct ? 'left-5' : 'left-1'}`} />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-6">
                                                                {(formData.products || []).map((product, index) => (
                                                                    <div key={product.id} className="p-6 bg-white border border-gray-100 rounded-[24px] space-y-5 relative group shadow-sm">
                                                                        <button
                                                                            onClick={() => removeProduct(product.id)}
                                                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                                                                        >
                                                                            <X size={12} />
                                                                        </button>

                                                                        <div className="space-y-4">
                                                                            <div className="space-y-1.5">
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product {index + 1} Title</label>
                                                                                <input
                                                                                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all"
                                                                                    placeholder="E.g. The Masterclass Bundle"
                                                                                    value={product.title}
                                                                                    onChange={e => updateProduct(product.id, 'title', e.target.value)}
                                                                                />
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                <div className="space-y-1.5">
                                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price (₹)</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all"
                                                                                        placeholder="999"
                                                                                        value={product.price}
                                                                                        onChange={e => updateProduct(product.id, 'price', e.target.value)}
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1.5">
                                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Image</label>
                                                                                    <div className="space-y-2">
                                                                                        <label className="flex items-center justify-center w-full aspect-square bg-gray-50/50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100 transition-all border-dashed relative overflow-hidden group">
                                                                                            {product.image ? (
                                                                                                <>
                                                                                                    <img src={product.image} className="w-full h-full object-cover" />
                                                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                        <Upload size={14} className="text-white" />
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                <Upload size={14} className="text-gray-400 group-hover:scale-110 transition-transform" />
                                                                                            )}
                                                                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleProductImageUpload(e, product.id)} />
                                                                                        </label>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <input
                                                                                                className="w-full px-2 py-1.5 bg-gray-50/50 border border-gray-100 rounded-lg text-[10px] font-bold outline-none focus:border-black transition-all"
                                                                                                placeholder="Or paste link"
                                                                                                onKeyDown={(e) => {
                                                                                                    if (e.key === 'Enter') {
                                                                                                        updateProduct(product.id, 'image', e.currentTarget.value);
                                                                                                        e.currentTarget.value = '';
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-1.5">
                                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Short Description</label>
                                                                                <textarea
                                                                                    className="w-full h-20 px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all resize-none"
                                                                                    placeholder="What's included?"
                                                                                    value={product.description}
                                                                                    onChange={e => updateProduct(product.id, 'description', e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                <button
                                                                    onClick={addProduct}
                                                                    className="w-full py-4 border-2 border-dashed border-gray-100 rounded-[20px] text-[13px] font-black text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Plus size={16} /> Add Another Product
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.id === "footer" && (
                                                        <div className="space-y-6">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Footer Copyright Text</label>
                                                                <input
                                                                    className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                                    placeholder="E.g. © 2024 Your Name"
                                                                    value={formData.footerText || ""}
                                                                    onChange={e => setFormData({ ...formData, footerText: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-4">
                                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Social Links (Usernames)</label>
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                                        <Instagram size={16} className="text-pink-500" />
                                                                        <input
                                                                            className="flex-1 bg-transparent text-[13px] font-bold outline-none"
                                                                            placeholder="Instagram handle"
                                                                            value={formData.socialInstagram || ""}
                                                                            onChange={e => setFormData({ ...formData, socialInstagram: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                                        <Twitter size={16} className="text-blue-400" />
                                                                        <input
                                                                            className="flex-1 bg-transparent text-[13px] font-bold outline-none"
                                                                            placeholder="Twitter handle"
                                                                            value={formData.socialTwitter || ""}
                                                                            onChange={e => setFormData({ ...formData, socialTwitter: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-10">
                            <div className="space-y-4">
                                <h1 className="text-[22px] font-black tracking-tight text-gray-900">Upload Your Digital Files</h1>
                                <div className="border border-gray-100 rounded-[28px] p-8 space-y-6 bg-[#FCFCFD] shadow-inner relative overflow-hidden">
                                    <div className="flex items-center gap-2 p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <input
                                            className="flex-1 px-4 py-2.5 text-[13px] font-bold outline-none placeholder:text-gray-300"
                                            placeholder="Add the link"
                                            value={formData.digitalFilesLink || ""}
                                            onChange={e => setFormData({ ...formData, digitalFilesLink: e.target.value })}
                                        />
                                        <button
                                            onClick={() => {
                                                if (formData.digitalFilesLink) {
                                                    setFormData({ ...formData, digitalFilesLink: formData.digitalFilesLink });
                                                    alert("Link added successfully!");
                                                }
                                            }}
                                            className="px-5 py-2.5 bg-[#F1F3F5] hover:bg-gray-200 rounded-xl text-[11px] font-black transition-all"
                                        >
                                            Add Link
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-[1px] flex-1 bg-gray-100" />
                                        <span className="text-[11px] font-black text-gray-300">Or</span>
                                        <div className="h-[1px] flex-1 bg-gray-100" />
                                    </div>
                                    <label className="flex flex-col items-center justify-center py-4 group cursor-pointer">
                                        {formData.digitalFilesImage ? (
                                            <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-100">
                                                <img src={formData.digitalFilesImage} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-gray-300 group-hover:text-black transition-colors mb-4" />
                                                <span className="text-[13px] font-black text-gray-900">Upload Image</span>
                                                <p className="text-[10px] font-bold text-gray-400 mt-1">Recommending 1250px x 1204 or up to 10 mb</p>
                                            </>
                                        )}
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'digitalFilesImage')} />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-[22px] font-black tracking-tight text-gray-900">Pricing</h2>
                                <div className="space-y-4">
                                    <div
                                        onClick={() => setFormData({ ...formData, pricingType: "fixed" })}
                                        className={`p-6 border rounded-[28px] cursor-pointer transition-all ${formData.pricingType === "fixed" ? "border-blue-500 bg-white shadow-md ring-2 ring-blue-500/10" : "border-gray-100 bg-[#FCFCFD] hover:border-gray-200"}`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[15px] font-black text-gray-900">Fixed Price</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.pricingType === "fixed" ? "bg-blue-500 border-blue-500" : "border-gray-200"}`}>
                                                {formData.pricingType === "fixed" && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                                            </div>
                                        </div>
                                        <p className="text-[12px] font-bold text-gray-400">Charge A One Time Fixed Pay</p>
                                    </div>

                                    {formData.pricingType === "fixed" && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Price *</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[13px]">Rs</span>
                                                    <input
                                                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                        value={formData.price}
                                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Discount Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-[13px]">Rs</span>
                                                    <input
                                                        className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                        value={formData.discountPrice}
                                                        onChange={e => setFormData({ ...formData, discountPrice: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => setFormData({ ...formData, pricingType: "decide" })}
                                        className={`p-6 border rounded-[28px] cursor-pointer transition-all ${formData.pricingType === "decide" ? "border-blue-500 bg-white shadow-md ring-2 ring-blue-500/10" : "border-gray-100 bg-[#FCFCFD] hover:border-gray-200"}`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[15px] font-black text-gray-900">Customers decide the Price</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.pricingType === "decide" ? "bg-blue-500 border-blue-500" : "border-gray-200"}`}>
                                                {formData.pricingType === "decide" && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                                            </div>
                                        </div>
                                        <p className="text-[12px] font-bold text-gray-400">Charge A One Time Fixed Pay</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4">
                                <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Advanced Options</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-black text-gray-900">Purchasing Power Parity</p>
                                                <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-wider">New</div>
                                            </div>
                                            <p className="text-[11px] font-bold text-gray-400">Increase your sales by 40% using PPP</p>
                                        </div>
                                        <div
                                            onClick={() => setFormData({ ...formData, pppEnabled: !formData.pppEnabled })}
                                            className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${formData.pppEnabled ? 'bg-black' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.pppEnabled ? 'left-5' : 'left-1'}`} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                        <div className="space-y-0.5">
                                            <p className="text-[13px] font-black text-gray-900">Limit Purchases</p>
                                            <p className="text-[11px] font-bold text-gray-400">Restrict how many times this can be bought</p>
                                        </div>
                                        <div
                                            onClick={() => setFormData({ ...formData, limitPurchases: !formData.limitPurchases })}
                                            className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${formData.limitPurchases ? 'bg-black' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.limitPurchases ? 'left-5' : 'left-1'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 pb-20">
                            {/* Theme & Styling */}
                            <div className="space-y-6">
                                <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Theme and Styling</h2>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'default', name: 'Default', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=150&fit=crop' },
                                        { id: 'modern', name: 'Modern', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=150&fit=crop' },
                                        { id: 'tech', name: 'Tech', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=150&fit=crop' },
                                        { id: 'dawn', name: 'Dawn', img: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=200&h=150&fit=crop' },
                                        { id: 'dusk', name: 'Dusk', img: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=200&h=150&fit=crop' },
                                        { id: 'glass', name: 'Glass', img: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200&h=150&fit=crop' }
                                    ].map(theme => (
                                        <div
                                            key={theme.id}
                                            onClick={() => setFormData({ ...formData, themeId: theme.id })}
                                            className="group cursor-pointer space-y-2.5 transition-all active:scale-95"
                                        >
                                            <div className={`aspect-[4/3] rounded-2xl overflow-hidden border-[3px] transition-all duration-300 ${formData.themeId === theme.id ? 'border-black shadow-xl scale-105' : 'border-gray-50 group-hover:border-gray-200'}`}>
                                                <img src={theme.img} className="w-full h-full object-cover" />
                                            </div>
                                            <p className={`text-[12px] font-bold text-center ${formData.themeId === theme.id ? 'text-black' : 'text-gray-400'}`}>{theme.name}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="border border-gray-100 rounded-[28px] overflow-hidden bg-white shadow-sm">
                                    <div className="flex p-1 bg-gray-50 rounded-[24px] m-4">
                                        {["Backgrounds", "Buttons"].map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveStyleTab(tab as any)}
                                                className={`flex-1 py-2.5 rounded-[20px] text-[11px] font-black transition-all ${activeStyleTab === tab ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="px-6 pb-8">
                                        {activeStyleTab === "Backgrounds" && (
                                            <div className="grid grid-cols-5 gap-2">
                                                {[
                                                    '1618005182384-a83a8bd57fbe',
                                                    '1633356122544-f134324a6cee',
                                                    '1451187580459-43490279c0fa',
                                                    '1620641788421-7a1c342ea42e',
                                                    '1470252649378-9c29740c9fa8'
                                                ].map(id => (
                                                    <div
                                                        key={id}
                                                        onClick={() => setFormData({ ...formData, customBgImage: `https://images.unsplash.com/photo-${id}?w=1200&auto=format&fit=crop` })}
                                                        className={`aspect-square rounded-full overflow-hidden border-2 cursor-pointer hover:scale-110 transition-transform ${formData.customBgImage?.includes(id) ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100'}`}
                                                    >
                                                        <img src={`https://images.unsplash.com/photo-${id}?w=100&h=100&fit=crop`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {activeStyleTab === "Buttons" && (
                                            <div className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Button Color</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            className="w-10 h-10 rounded-full border-none cursor-pointer"
                                                            value={formData.buttonColor || "#000000"}
                                                            onChange={e => setFormData({ ...formData, buttonColor: e.target.value })}
                                                        />
                                                        <input
                                                            className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black"
                                                            value={formData.buttonColor}
                                                            onChange={e => setFormData({ ...formData, buttonColor: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Text Colour</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            className="w-10 h-10 rounded-full border-none cursor-pointer"
                                                            value={formData.buttonTextColor || "#FFFFFF"}
                                                            onChange={e => setFormData({ ...formData, buttonTextColor: e.target.value })}
                                                        />
                                                        <input
                                                            className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black"
                                                            value={formData.buttonTextColor}
                                                            onChange={e => setFormData({ ...formData, buttonTextColor: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Checkout Experience */}
                            <div className="space-y-6 pt-6 border-t border-gray-100">
                                <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Checkout Experience</h2>

                                <div className="p-1 bg-[#F8F9FA] border border-gray-100 rounded-[28px]">
                                    <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm">
                                        <div className="space-y-1.5">
                                            <p className="text-[15px] font-black text-gray-900 leading-tight">Same Page Checkout</p>
                                            <p className="text-[12px] font-bold text-gray-400">Instant payment without redirects</p>
                                        </div>
                                        <button
                                            onClick={() => alert("Checkout customization coming soon in the next update!")}
                                            className="px-6 py-3 bg-[#F1F5F9] hover:bg-black hover:text-white rounded-full text-[12px] font-black transition-all"
                                        >
                                            Customize
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Customer Information</h3>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-gray-200">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl">
                                                    <Mail size={18} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-[14px] font-black text-gray-900">Email Verification</span>
                                            </div>
                                            <div
                                                onClick={() => setFormData({ ...formData, emailVerification: !formData.emailVerification })}
                                                className={`w-12 h-7 rounded-full transition-all relative cursor-pointer ${formData.emailVerification ? 'bg-black' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.emailVerification ? 'left-6' : 'left-1'}`} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-gray-200">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 flex items-center justify-center bg-purple-50 text-purple-600 rounded-xl">
                                                    <Phone size={18} strokeWidth={2.5} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[14px] font-black text-gray-900">Phone number</p>
                                                    <p className="text-[11px] font-bold text-gray-400">Required Verified OTP</p>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => setFormData({ ...formData, phoneVerification: !formData.phoneVerification })}
                                                className={`w-12 h-7 rounded-full transition-all relative cursor-pointer ${formData.phoneVerification ? 'bg-black' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${formData.phoneVerification ? 'left-6' : 'left-1'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="space-y-4 pt-8 border-t border-gray-100">
                                <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Pricing</h2>
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest pl-1">GST on Price</label>
                                    <div className="relative">
                                        <input
                                            className="w-full pl-5 pr-4 py-4 bg-gray-50/50 border border-gray-100 rounded-[16px] text-[14px] font-bold outline-none focus:border-black focus:bg-white transition-all shadow-sm placeholder:text-gray-300"
                                            placeholder="0%"
                                            value={formData.gstOnPrice || ""}
                                            onChange={e => setFormData({ ...formData, gstOnPrice: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Terms and Policies */}
                            <div className="space-y-6 pt-8 border-t border-gray-100">
                                <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Terms and Policies</h2>
                                <div className="space-y-5">
                                    {[
                                        { label: "Terms and Conditions", field: "termsAndConditions" },
                                        { label: "Refund Policy", field: "refundPolicy" },
                                        { label: "Privacy Policy", field: "privacyPolicy" }
                                    ].map(policy => (
                                        <div key={policy.field} className="space-y-2.5">
                                            <div className="flex justify-between items-baseline px-1">
                                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">{policy.label}</label>
                                                <span className="text-[10px] font-black text-gray-300 tracking-wider">0/5000</span>
                                            </div>
                                            <textarea
                                                className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-[20px] text-[13px] font-medium outline-none focus:border-black focus:bg-white transition-all shadow-sm resize-none h-[120px]"
                                                placeholder={`Enter your ${policy.label.toLowerCase()}...`}
                                                value={(formData as any)[policy.field] || ""}
                                                onChange={e => setFormData({ ...formData, [policy.field]: e.target.value })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Page URL */}
                            <div className="space-y-4 pt-8 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <label className="text-[13px] font-black text-gray-900">Page URL</label>
                                    <div className="group relative">
                                        <Info size={14} className="text-gray-300 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-black text-white text-[10px] leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            This is the unique link where your website will be hosted.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center px-6 py-4 bg-[#F8F9FA] border border-gray-100 rounded-[20px] group focus-within:border-black focus-within:bg-white transition-all shadow-sm">
                                    <span className="text-[14px] font-black text-gray-400 pr-1 tracking-tight">{currentHost.replace(/^https?:\/\//, '')}/p/</span>
                                    <input
                                        className="flex-1 bg-transparent text-[14px] font-bold outline-none text-gray-900 placeholder:text-gray-300"
                                        value={formData.customPageUrl || ""}
                                        onChange={e => {
                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                                            setFormData({ ...formData, customPageUrl: val });
                                        }}
                                        placeholder="my-cool-page"
                                    />
                                </div>
                            </div>

                            {/* Additional Settings */}
                            <div className="space-y-8 pt-8 border-t border-gray-100 pb-20">
                                <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Additional Settings</h2>

                                <div className="space-y-6">
                                    {[
                                        { id: 'darkTheme', title: 'Dark Theme', sub: 'Switch to a premium dark aesthetic for your entire page.' },
                                        { id: 'deactivateSales', title: 'Deactivate Sales', sub: 'Temporarily stop accepting new orders while keeping the page live.' },
                                        { id: 'pageExpiry', title: 'Page Expiry', sub: 'Automatically hide the buy buttons after a specific date.' },
                                        { id: 'trackingToggle', title: 'Advanced Tracking', sub: 'Enable detailed visitor analytics and pixel tracking.' }
                                    ].map((item) => (
                                        <React.Fragment key={item.id}>
                                            <div className="flex items-center justify-between group">
                                                <div className="space-y-1.5 pr-8">
                                                    <h3 className="text-[14px] font-black text-gray-900">{item.title}</h3>
                                                    {item.sub && <p className="text-[11px] font-bold text-gray-400 leading-relaxed max-w-[320px]">{item.sub}</p>}
                                                </div>
                                                <div
                                                    onClick={() => setFormData({ ...formData, [item.id]: !((formData as any)[item.id]) })}
                                                    className={`w-12 h-7 rounded-full transition-all relative cursor-pointer flex-shrink-0 ${((formData as any)[item.id]) ? 'bg-black' : 'bg-gray-100'}`}
                                                >
                                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${((formData as any)[item.id]) ? 'left-6' : 'left-1'}`} />
                                                </div>
                                            </div>
                                            {item.id === 'pageExpiry' && formData.pageExpiry && (
                                                <div className="pl-4 pb-2 animate-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Expiry Date</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-5 py-3 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                        value={formData.pageExpiryDate || ""}
                                                        onChange={e => setFormData({ ...formData, pageExpiryDate: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Tracking IDs - only show if tracking toggle is ON */}
                                {formData.trackingToggle && (
                                    <div className="space-y-8 pt-6 animate-in slide-in-from-top-4 duration-500">
                                        <div className="space-y-5">
                                            <div className="space-y-1">
                                                <h3 className="text-[14px] font-black text-gray-900">Meta Pixel</h3>
                                                <p className="text-[12px] font-bold text-gray-400">Add your Meta Pixel IDs to get crucial visitor-level data.</p>
                                            </div>
                                            <input
                                                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[16px] text-[13px] font-bold outline-none focus:border-black transition-all shadow-sm"
                                                placeholder="Enter Pixel ID"
                                                value={formData.metaPixelId || ""}
                                                onChange={e => setFormData({ ...formData, metaPixelId: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-5">
                                            <div className="space-y-1">
                                                <h3 className="text-[14px] font-black text-gray-900">Google Analytics</h3>
                                                <p className="text-[12px] font-bold text-gray-400">Add your Measurement IDs to track visitors.</p>
                                            </div>
                                            <input
                                                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[16px] text-[13px] font-bold outline-none focus:border-black transition-all shadow-sm"
                                                placeholder="G-XXXXXXXXXX"
                                                value={formData.googleAnalyticsId || ""}
                                                onChange={e => setFormData({ ...formData, googleAnalyticsId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="px-10 py-8 border-t border-gray-50 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`flex-1 py-4 border border-gray-200 rounded-2xl text-[14px] font-black text-gray-900 hover:bg-gray-50 transition-all ${step === 1 ? 'invisible' : ''}`}
                    >
                        Back
                    </button>
                    <button
                        onClick={step === 3 ? handlePublish : onNext}
                        disabled={isPublishing}
                        className="flex-1 py-4 bg-black text-white rounded-2xl text-[14px] font-black shadow-lg shadow-black/5 hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isPublishing ? (
                            <>
                                <RefreshCw className="animate-spin" size={18} />
                                Publishing...
                            </>
                        ) : (
                            step === 3 ? "Publish" : "Next"
                        )}
                    </button>
                </footer>
            </div>

            {/* Final Success Screen */}
            {isLive && (
                <div className="fixed inset-0 z-[100] animate-in fade-in duration-700 flex items-center justify-center p-6 overflow-hidden font-sans">
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=2500&auto=format&fit=crop"
                            className="w-full h-full object-cover scale-105"
                            alt="Classical Art Background"
                        />
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" />
                    </div>

                    <div className="relative z-10 bg-white rounded-[40px] max-w-md w-full p-8 shadow-[0_32px_120px_rgba(0,0,0,0.5)] flex flex-col items-center text-center space-y-7 animate-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 bg-[#EAFBF1] rounded-full flex items-center justify-center relative shadow-[0_20px_40px_rgba(46,204,113,0.15)]">
                            <Check className="text-[#27AE60]" size={32} strokeWidth={3} />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-[28px] font-black tracking-tight leading-[1.1] text-gray-900">Your website is live!</h1>
                            <p className="text-[#64748B] font-bold text-[15px] max-w-[280px] mx-auto leading-relaxed">
                                Congratulations! Your website is ready to share with the world.
                            </p>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="bg-[#F8F9FA] border border-gray-100/50 rounded-[28px] p-4 pb-6 space-y-3">
                                <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.25em] text-center">Your Website URL</p>
                                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                    <div className="flex-1 font-bold text-gray-900 text-[13px] overflow-hidden text-ellipsis whitespace-nowrap text-center">
                                        {currentHost}/p/{formData.customPageUrl || "my-website"}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${currentHost}/p/${formData.customPageUrl || "my-website"}`);
                                        }}
                                        className="p-2 hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-black"
                                    >
                                        <Copy size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => window.open(`/p/${formData.customPageUrl || "my-website"}`, '_blank')}
                                className="flex-1 bg-black text-white py-3.5 rounded-full font-black text-[14px] flex items-center justify-center gap-2 transition-all hover:bg-black/95 active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
                            >
                                <ExternalLink size={16} strokeWidth={2.5} /> Visit Website
                            </button>
                            <button
                                onClick={() => setIsLive(false)}
                                className="flex-1 py-3.5 bg-white border border-[#E2E8F0] rounded-full font-black text-[14px] text-gray-900 flex items-center justify-center gap-2 transition-all hover:bg-gray-50 active:scale-95"
                            >
                                <Edit3 size={16} strokeWidth={2.5} /> Edit
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setIsLive(false);
                                onCancel();
                            }}
                            className="text-[11px] font-black text-gray-400 hover:text-black transition-all uppercase tracking-[0.2em] pt-2"
                        >
                            Done, Back to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

