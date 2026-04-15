"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Script from "next/script";
import { FormData, Product, Website } from "@/lib/types";
import { extractApiErrorMessage, getErrorMessage, logError } from "@/lib/error-utils";
import {
    Check, X, Mail, Phone, Users, Instagram, Twitter, Globe,
    ArrowRight, ShoppingBag, ShieldCheck, Lock, RefreshCw,
    Loader2, Sparkles, Store
} from "lucide-react";

interface RazorpayPaymentSuccess {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
}

interface RazorpayFailurePayload {
    error?: unknown;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image: string;
    order_id: string;
    handler: (response: RazorpayPaymentSuccess) => void | Promise<void>;
    prefill: { email: string; contact: string };
    theme: { color: string };
    modal: { ondismiss: () => void };
}

interface RazorpayInstance {
    on(event: "payment.failed", handler: (response: RazorpayFailurePayload) => void): void;
    open(): void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor;
    }
}

export default function PublicProductPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const username = searchParams.get("u") || "";
    const [formData, setFormData] = useState<FormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<"info" | "verifying" | "success">("info");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Verification States
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [verifyingPhone, setVerifyingPhone] = useState(false);
    const [emailOtp, setEmailOtp] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [showEmailOtp, setShowEmailOtp] = useState(false);
    const [showPhoneOtp, setShowPhoneOtp] = useState(false);
    const [customAmount, setCustomAmount] = useState("");
    const [policyModal, setPolicyModal] = useState<{
        title: "Terms" | "Privacy" | "Refunds";
        content: string;
    } | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                // 1. Try fetching from Cloud Index (S3) - This makes the site truly public
                const query = username ? `?slug=${slug}&username=${encodeURIComponent(username)}` : `?slug=${slug}`;
                const response = await fetch(`/api/websites${query}`);
                if (response.ok) {
                    const cloudData = await response.json();
                    setFormData(cloudData);
                    return;
                }
            } catch (err) {
                logError("public page cloud fetch fallback", err);
            }

            // 2. Fallback to Local Storage (for draft previews or offline mode)
            const localKey = username ? `website_${username}_${slug}` : `website_${slug}`;
            const localData = localStorage.getItem(localKey);
            if (localData) {
                try {
                    setFormData(JSON.parse(localData));
                } catch (err) {
                    logError("public page parse local config", err);
                }
            }
            setLoading(false);
        };

        fetchConfig().finally(() => setLoading(false));
    }, [slug, username]);

    // Expiry Check Hook
    const [isExpired, setIsExpired] = useState(false);
    useEffect(() => {
        if (formData?.pageExpiry && formData?.pageExpiryDate) {
            const expiry = new Date(formData.pageExpiryDate);
            if (new Date() > expiry) {
                setIsExpired(true);
            }
        }
    }, [formData]);

    // Inject Tracking Scripts Hook
    useEffect(() => {
        if (formData?.metaPixelId) {
            const script = document.createElement("script");
            script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${formData.metaPixelId}');fbq('track', 'PageView');`;
            document.head.appendChild(script);
        }
        if (formData?.googleAnalyticsId) {
            const script1 = document.createElement("script");
            script1.async = true;
            script1.src = `https://www.googletagmanager.com/gtag/js?id=${formData.googleAnalyticsId}`;
            document.head.appendChild(script1);
            const script2 = document.createElement("script");
            script2.innerHTML = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${formData.googleAnalyticsId}');`;
            document.head.appendChild(script2);
        }
    }, [formData?.metaPixelId, formData?.googleAnalyticsId]);

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-white space-y-4">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Loading Experience</p>
        </div>
    );

    if (!formData) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <X className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Website Not Found</h1>
            <p className="text-gray-500 font-medium">This page has not been published yet or the link is incorrect.</p>
        </div>
    );

    const isDark = formData?.darkTheme;
    const isSalesDeactivated = formData?.deactivateSales;

    const themeStyles = {
        tech: {
            bg: 'bg-[#050B15]',
            text: 'text-white',
            sub: 'text-slate-400',
            font: "'Inter', sans-serif",
            border: 'border-white/5',
            card: 'bg-white/[0.03] backdrop-blur-3xl',
            accent: '#0EA5E9',
            gradient: 'from-blue-600/20 to-transparent'
        },
        dawn: {
            bg: 'bg-[#FFFAF5]',
            text: 'text-[#2D1B08]',
            sub: 'text-[#8B5E3C]',
            font: "'Inter', sans-serif",
            border: 'border-[#F2E8DF]',
            card: 'bg-white',
            accent: '#EA580C',
            gradient: 'from-orange-500/10 to-transparent'
        },
        modern: {
            bg: isDark ? 'bg-[#0A0A0B]' : 'bg-[#FDFDFD]',
            text: isDark ? 'text-slate-50' : 'text-slate-950',
            sub: isDark ? 'text-slate-400' : 'text-slate-500',
            font: "'Inter', sans-serif",
            border: isDark ? 'border-white/[0.08]' : 'border-slate-200/60',
            card: isDark ? 'bg-[#121214]' : 'bg-white',
            accent: isDark ? '#FFFFFF' : '#000000',
            gradient: isDark ? 'from-white/5 to-transparent' : 'from-slate-500/5 to-transparent'
        },
        glass: {
            bg: isDark ? 'bg-[#030712]' : 'bg-[#F8FAFC]',
            text: isDark ? 'text-white' : 'text-slate-900',
            sub: isDark ? 'text-slate-400' : 'text-slate-500',
            font: "'Inter', sans-serif",
            border: isDark ? 'border-white/10' : 'border-white/60',
            card: isDark ? 'bg-white/[0.06] backdrop-blur-2xl' : 'bg-white/70 backdrop-blur-3xl',
            accent: '#6366F1',
            gradient: 'from-indigo-600/20 via-transparent to-pink-500/10'
        },
        default: {
            bg: isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]',
            text: isDark ? 'text-slate-50' : 'text-slate-900',
            sub: isDark ? 'text-slate-400' : 'text-slate-500',
            font: "'Inter', sans-serif",
            border: isDark ? 'border-white/10' : 'border-slate-200',
            card: isDark ? 'bg-white/[0.04]' : 'bg-white',
            accent: formData?.brandColor || '#000000',
            gradient: 'from-current/5 to-transparent'
        }
    };

    if (isExpired) return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-8 animate-pulse">
                <Lock className="text-red-500" size={40} />
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Campaign Ended</h1>
            <p className="text-gray-500 font-bold text-lg max-w-sm leading-relaxed">This page has expired and is no longer accepting responses or orders.</p>
            <button onClick={() => window.location.href = '/'} className="mt-10 px-8 py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/20">Back to SuperProfile</button>
        </div>
    );


    const style = themeStyles[(formData?.themeId as keyof typeof themeStyles)] || themeStyles.default;
    const brandColor = formData?.brandColor || style.accent;

    const handlePurchaseClick = (product?: Product) => {
        if (isSalesDeactivated) return;
        setSelectedProduct(product || null);
        setShowCheckout(true);
        setCheckoutStep("info");
    };

    const verifyEmail = async () => {
        if (!email) return;
        setVerifyingEmail(true);
        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'email', target: email })
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                setShowEmailOtp(true);
            } else {
                alert(extractApiErrorMessage(data, "Email verification failed"));
            }
        } catch (err) {
            logError("public page verify email", err);
            alert(getErrorMessage(err, "Verification service unavailable"));
        } finally {
            setVerifyingEmail(false);
        }
    };

    const verifyPhone = async () => {
        if (!phone) return;
        setVerifyingPhone(true);
        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'phone', target: phone })
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                setShowPhoneOtp(true);
            } else {
                alert(extractApiErrorMessage(data, "Failed to send OTP"));
            }
        } catch (err) {
            logError("public page verify phone", err);
            alert(getErrorMessage(err, "Phone verification service unavailable"));
        } finally {
            setVerifyingPhone(false);
        }
    };

    const confirmEmailOtp = async () => {
        if (!emailOtp) return;
        try {
            const res = await fetch('/api/verify', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: email, otp: emailOtp })
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.verified) {
                setEmailVerified(true);
                setShowEmailOtp(false);
            } else {
                alert(extractApiErrorMessage(data, "Invalid OTP entered"));
            }
        } catch (err) {
            logError("public page confirm email otp", err);
            alert(getErrorMessage(err, "OTP verification failed"));
        }
    };

    const confirmPhoneOtp = async () => {
        if (!phoneOtp) return;
        try {
            const res = await fetch('/api/verify', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: phone, otp: phoneOtp })
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.verified) {
                setPhoneVerified(true);
                setShowPhoneOtp(false);
            } else {
                alert(extractApiErrorMessage(data, "Invalid OTP entered"));
            }
        } catch (err) {
            logError("public page confirm phone otp", err);
            alert(getErrorMessage(err, "OTP verification failed"));
        }
    };

    const canComplete = () => {
        const emailNeeded = formData.emailVerification && !emailVerified;
        const phoneNeeded = formData.phoneVerification && !phoneVerified;
        return !emailNeeded && !phoneNeeded;
    };

    const handlePayment = async () => {
        const basePrice = Number(selectedProduct?.price || customAmount || formData?.price || 0);
        const gstPercent = parseInt(formData?.gstOnPrice?.replace('%', '') || '0');
        const finalAmount = basePrice + (basePrice * gstPercent / 100);

        if (finalAmount <= 0) {
            completeCheckout();
            return;
        }

        try {
            // 1. Create Order on Backend
            const res = await fetch('/api/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalAmount,
                    currency: "INR",
                })
            });
            const order = await res.json().catch(() => null);

            if (!res.ok || !order?.id) {
                const orderError = extractApiErrorMessage(order, "Unknown error");
                logError("public page order creation failed", order);
                alert(`Order creation failed: ${orderError}`);
                return;
            }

            // 2. Open Razorpay Checkout
            const Razorpay = window.Razorpay;
            if (!Razorpay) {
                alert("Razorpay SDK not loaded. Please check your connection or disable adblockers.");
                return;
            }

            const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
            if (!razorpayKey) {
                alert("Payment key is missing. Please configure NEXT_PUBLIC_RAZORPAY_KEY_ID.");
                return;
            }

            const options: RazorpayOptions = {
                key: razorpayKey,
                amount: order.amount, // Use amount from the created order (already in paise)
                currency: order.currency,
                name: formData?.title || "SuperProfile",
                description: "Purchase for " + (selectedProduct?.title || formData?.title),
                image: formData?.coverImage || "",
                order_id: order.id,
                handler: async function (response: RazorpayPaymentSuccess) {
                    try {
                        const verifyRes = await fetch("/api/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(response),
                        });
                        const verifyData = await verifyRes.json().catch(() => null);
                        if (!verifyRes.ok || !verifyData?.verified) {
                            const verifyError = extractApiErrorMessage(verifyData, "Payment verification failed");
                            alert(`Payment verification failed: ${verifyError}`);
                            return;
                        }
                    } catch (verifyErr) {
                        logError("public page verify payment", verifyErr);
                        alert("Payment verification failed. Please contact support if amount was deducted.");
                        return;
                    }

                    completeCheckout();
                },
                prefill: {
                    email: email,
                    contact: phone,
                },
                theme: {
                    color: brandColor || "#000000",
                },
                modal: {
                    ondismiss: function () {
                        console.log("Checkout modal closed");
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.on("payment.failed", function (response: RazorpayFailurePayload) {
                const failureMessage = extractApiErrorMessage(response?.error, "Payment failed");
                alert("Payment Failed: " + failureMessage);
            });
            rzp.open();

        } catch (err: unknown) {
            logError("public page payment flow", err);
            alert("Payment gateway unreachable: " + getErrorMessage(err, "Unknown error"));
        }
    };

    const completeCheckout = () => {
        const amountStr = selectedProduct?.price || customAmount || formData?.price || "0";
        updateStats(amountStr);
        setCheckoutStep("success");
    };

    const updateStats = (amountStr: string) => {
        if (!slug) return;
        const amount = parseInt(amountStr.replace(/[^\d]/g, ''));

        // Update websites_list in localStorage
        const rawList = localStorage.getItem('websites_list');
        if (rawList) {
            const list = JSON.parse(rawList) as Website[];
            const index = list.findIndex((s) => s.slug === slug);
            if (index !== -1) {
                const site = list[index];
                const currentRev = parseInt(site.revenue?.replace(/[^\d]/g, '') || '0');
                const currentSale = parseInt(site.sale || '0');

                site.revenue = `₹${(currentRev + amount).toLocaleString('en-IN')}`;
                site.sale = (currentSale + 1).toString();

                localStorage.setItem('websites_list', JSON.stringify(list));
            }
        }
    };

    const openPolicyModal = (policy: "Terms" | "Privacy" | "Refunds") => {
        if (!formData) return;
        const content =
            policy === "Terms"
                ? formData.termsAndConditions
                : policy === "Privacy"
                    ? formData.privacyPolicy
                    : formData.refundPolicy;

        setPolicyModal({
            title: policy,
            content: (content || "Not specified.").trim(),
        });
    };

    return (
        <div
            className={`min-h-screen ${style.bg} ${style.text} transition-colors duration-700 selection:bg-black selection:text-white`}
            style={{
                backgroundImage: formData.customBgImage ? `linear-gradient(rgba(${isDark || formData.themeId === 'tech' || formData.themeId === 'dusk' ? '0,0,0,0.6' : '255,255,255,0.6'}), rgba(${isDark || formData.themeId === 'tech' || formData.themeId === 'dusk' ? '0,0,0,0.8' : '255,255,255,0.8'})), url(${formData.customBgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                fontFamily: style.font
            }}
        >
            <div className="max-w-4xl mx-auto py-24 px-6 md:px-12 flex flex-col items-center gap-24">
                {/* Refined Header/Hero */}
                <header className="flex flex-col items-center text-center gap-14 w-full animate-in fade-in slide-in-from-top-6 duration-1000">
                    <div className="space-y-10 max-w-3xl">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className="h-1 w-10 rounded-full" style={{ backgroundColor: brandColor }} />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Luxury Experience</span>
                            <div className="h-1 w-10 rounded-full" style={{ backgroundColor: brandColor }} />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] drop-shadow-2xl break-all">
                            {formData.title}
                        </h1>
                        <p className={`text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto opacity-70 ${style.sub} break-words whitespace-pre-wrap`}>
                            {formData.description || formData.productDescription}
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-6 pt-4 w-full">
                        <button
                            onClick={() => handlePurchaseClick()}
                            className="group relative px-20 py-8 rounded-[40px] text-xl font-black shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] hover:scale-[1.03] hover:-translate-y-1 active:scale-95 transition-all w-full md:w-auto min-w-[380px] overflow-hidden"
                            style={{ backgroundColor: brandColor, color: '#FFFFFF' }}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <span className="relative flex items-center justify-center gap-3 tracking-tight">
                                {formData.cta || "Get Instant Access"} {formData.pricingType === 'decide' ? '• Pay What You Want' : formData.price ? `• ₹${formData.price}` : ''}
                                <ArrowRight size={26} className="group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
                            </span>
                        </button>

                        {formData.pppEnabled && formData.discountPrice && (
                            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-sm animate-pulse">
                                <Sparkles size={16} className="text-green-500" />
                                <p className="text-sm font-black text-green-500 uppercase tracking-widest">
                                    Flash Sale: Save {Math.round((1 - Number(formData.discountPrice) / Number(formData.price)) * 100)}% Now
                                </p>
                            </div>
                        )}
                    </div>

                    {formData.coverImage || formData.digitalFilesImage ? (
                        <div className={`w-full aspect-video rounded-[64px] overflow-hidden shadow-[0_80px_160px_-40px_rgba(0,0,0,0.4)] border ${style.border} relative group mt-8 p-1 bg-white/5`}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent z-10 pointer-events-none" />
                            <img src={formData.coverImage || formData.digitalFilesImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 rounded-[60px]" alt="Cover" />
                        </div>
                    ) : null}
                </header>

                {/* Product Section - Refined Cards */}
                <section className="w-full space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    <div className="flex items-center gap-4 w-full">
                        <div className="h-[1px] flex-1 bg-current opacity-10" />
                        <h2 className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 px-4 whitespace-nowrap">The Collection</h2>
                        <div className="h-[1px] flex-1 bg-current opacity-10" />
                    </div>

                    {formData.products && formData.products.filter(p => p.title || p.price).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {formData.products.filter(p => p.title || p.price).map((product) => (
                                <div key={product.id} className={`group p-8 md:p-10 rounded-[64px] border ${style.border} ${style.card} shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:shadow-[0_64px_128px_-32px_rgba(0,0,0,0.2)] transition-all duration-700 hover:-translate-y-3 relative overflow-hidden flex flex-col`}>
                                    <div className={`absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br ${style.gradient} opacity-20 blur-3xl pointer-events-none`} />
                                    <div className="flex flex-col gap-8 relative z-10 flex-1">
                                        <div className="w-full aspect-square rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative shrink-0">
                                            {product.image ? (
                                                <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-200">
                                                    <Store size={80} strokeWidth={1} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between space-y-6 text-left">
                                            <div className="space-y-4">
                                                <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight break-all">{product.title}</h3>
                                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                                    <div className="px-5 py-2 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Digital Asset</div>
                                                </div>
                                                <p className={`text-lg leading-relaxed opacity-80 ${style.sub} break-all whitespace-pre-wrap`}>{product.description}</p>
                                            </div>
                                            <div className="pt-8 border-t border-black/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                                <div className="flex items-baseline gap-3">
                                                    <span className="text-4xl font-black tracking-tighter">₹{product.price}</span>
                                                </div>
                                                <button
                                                    onClick={() => handlePurchaseClick(product)}
                                                    className="px-10 py-5 rounded-[24px] font-black text-white shadow-xl hover:scale-[1.05] active:scale-95 transition-all text-[14px] uppercase tracking-[0.2em] w-full sm:w-auto"
                                                    style={{ backgroundColor: brandColor }}
                                                >
                                                    Unlock Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`p-10 md:p-16 lg:p-20 rounded-[80px] border ${style.border} ${style.card} shadow-[0_100px_200px_-50px_rgba(0,0,0,0.4)] relative overflow-hidden group max-w-4xl mx-auto flex flex-col items-center text-center`}>
                            <div className={`absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-gradient-to-tr ${style.gradient} opacity-20 blur-[120px] pointer-events-none group-hover:opacity-40 transition-opacity duration-1000`} />
                            <div className="flex flex-col gap-12 relative z-10 w-full items-center">
                                <div className="w-full max-w-md aspect-square rounded-[56px] overflow-hidden border border-white/10 shadow-3xl relative shrink-0">
                                    <img src={formData.coverImage || formData.digitalFilesImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex flex-col items-center space-y-8 w-full">
                                    <div className="space-y-6">
                                        <h3 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] break-all">{formData.title}</h3>
                                        <div className="flex flex-wrap justify-center items-center gap-4">
                                            <div className="px-6 py-2.5 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-black uppercase tracking-[0.2em] border border-blue-500/20">Secured Content</div>
                                            <div className="px-6 py-2.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">Instant Delivery</div>
                                        </div>
                                    </div>
                                    <p className={`text-xl lg:text-2xl leading-relaxed opacity-70 ${style.sub} font-medium tracking-tight break-all whitespace-pre-wrap max-w-2xl`}>{formData.productDescription || formData.description}</p>
                                    <div className="pt-12 border-t border-white/10 flex flex-col items-center gap-10 w-full">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black opacity-30 uppercase tracking-[0.4em] mb-2 font-sans">Investment</p>
                                            <div className="flex items-baseline justify-center gap-4">
                                                <span className="text-6xl font-black tracking-tighter">₹{formData.price}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePurchaseClick()}
                                            className="px-16 py-7 rounded-[40px] font-black text-white shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl uppercase tracking-[0.2em] w-full md:w-auto overflow-hidden relative group/btn"
                                            style={{ backgroundColor: brandColor }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform" />
                                            <span className="relative">Unlock Now</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* FAQ Section - Refined */}
                {formData.faqs && formData.faqs.length > 0 && (
                    <section className="w-full space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                        <div className="text-center space-y-4">
                            <h3 className="text-4xl md:text-5xl font-black tracking-tight">Curious Minds Want to Know</h3>
                            <p className={`text-xl font-bold opacity-60 ${style.sub}`}>Everything you need to know before you dive in</p>
                        </div>
                        <div className="grid gap-8 md:grid-cols-2">
                            {formData.faqs.map((faq, i) => (
                                <div key={i} className={`p-12 rounded-[56px] border ${style.border} ${style.card} shadow-xl hover:scale-[1.02] transition-all duration-700 group text-left relative overflow-hidden`}>
                                    <div className={`absolute -top-12 -right-12 w-32 h-32 bg-current opacity-0 group-hover:opacity-[0.03] rounded-full transition-opacity duration-700`} />
                                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-500 shadow-sm">
                                        <span className="text-[11px] font-black tracking-[0.3em] uppercase">0{i + 1}</span>
                                    </div>
                                    <h4 className="text-3xl font-black mb-6 tracking-tight leading-tight break-all">{faq.question}</h4>
                                    <p className={`text-xl leading-relaxed opacity-60 ${style.sub} font-medium break-all whitespace-pre-wrap`}>{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* About Us Section */}
                {formData.aboutUs && (
                    <section className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="flex items-center gap-4 w-full">
                            <div className="h-[1px] flex-1 bg-current opacity-10" />
                            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 px-4">The Story</h2>
                            <div className="h-[1px] flex-1 bg-current opacity-10" />
                        </div>
                        <div className={`p-12 md:p-20 rounded-[64px] border ${style.border} ${style.card} text-center space-y-8`}>
                            <h3 className="text-4xl md:text-5xl font-black tracking-tight">Behind the Brand</h3>
                            <p className={`text-xl md:text-2xl leading-relaxed opacity-70 ${style.sub} max-w-3xl mx-auto whitespace-pre-wrap`}>
                                {formData.aboutUs}
                            </p>
                        </div>
                    </section>
                )}

                {/* Gallery Section */}
                {formData.galleryImages && formData.galleryImages.length > 0 && (
                    <section className="w-full space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="text-center space-y-4">
                            <h3 className="text-4xl md:text-5xl font-black tracking-tight">{formData.galleryTitle || "Visual Showcase"}</h3>
                            <div className={`h-1.5 w-24 mx-auto rounded-full`} style={{ backgroundColor: brandColor }} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {formData.galleryImages.map((img, i) => (
                                <div key={i} className={`group aspect-square rounded-[40px] overflow-hidden border ${style.border} shadow-2xl relative`}>
                                    <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Gallery ${i}`} />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Testimonial Section */}
                {formData.testimonialName && (
                    <section className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className={`relative p-12 md:p-24 rounded-[80px] border ${style.border} ${style.card} overflow-hidden group`}>
                            <div className={`absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br ${style.gradient} opacity-20 blur-[100px] pointer-events-none group-hover:opacity-40 transition-opacity duration-1000`} />

                            <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl">
                                    {formData.testimonialImage ? (
                                        <img src={formData.testimonialImage} className="w-full h-full object-cover" alt={formData.testimonialName} />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                            <Users size={40} />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6 max-w-3xl">
                                    <p className="text-2xl md:text-4xl font-black italic leading-[1.2] tracking-tight">
                                        <span className="not-italic">&ldquo;</span>
                                        {formData.testimonialComment || "Absolutely life-changing experience. Highly recommended for anyone looking to scale their digital presence!"}
                                        <span className="not-italic">&rdquo;</span>
                                    </p>
                                    <div className="space-y-1">
                                        <h4 className="text-xl font-black uppercase tracking-widest">{formData.testimonialName}</h4>
                                        <p className={`text-sm font-bold opacity-40 ${style.sub}`}>Verified Partner</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Refined Footer */}
                <footer className="w-full pt-32 pb-20 border-t border-white/5 animate-in fade-in duration-1000 delay-700">
                    <div className="flex flex-col items-center gap-16">
                        <div className="flex items-center gap-12">
                            <a href={formData.socialInstagram ? `https://instagram.com/${formData.socialInstagram}` : "#"} target="_blank" className="p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all duration-500 hover:scale-110 active:scale-90 shadow-xl">
                                <Instagram size={28} strokeWidth={2.5} />
                            </a>
                            <a href={formData.socialTwitter ? `https://twitter.com/${formData.socialTwitter}` : "#"} target="_blank" className="p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all duration-500 hover:scale-110 active:scale-90 shadow-xl">
                                <Twitter size={28} strokeWidth={2.5} />
                            </a>
                            <a
                                href={formData.websiteLink?.startsWith('http') ? formData.websiteLink : `https://${formData.websiteLink}`}
                                target="_blank"
                                className={`p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all duration-500 hover:scale-110 active:scale-90 shadow-xl ${!formData.websiteLink ? 'hidden' : ''}`}
                            >
                                <Globe size={28} strokeWidth={2.5} />
                            </a>
                        </div>

                        <div className="flex flex-wrap justify-center gap-10">
                            {["Terms", "Privacy", "Refunds"].map((policy) => (
                                <button
                                    key={policy}
                                    onClick={() => openPolicyModal(policy as "Terms" | "Privacy" | "Refunds")}
                                    className="text-[11px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 transition-opacity flex items-center gap-2 group"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {policy}
                                </button>
                            ))}
                        </div>

                        <div className="text-center space-y-8 pt-8 border-t border-white/5 w-full max-w-sm">
                            <div className="flex items-center justify-center gap-3">
                                <div className="h-[1px] w-8 bg-current opacity-10" />
                                <span className="text-[10px] font-black uppercase tracking-[0.6em] opacity-20">Securely Hosted</span>
                                <div className="h-[1px] w-8 bg-current opacity-10" />
                            </div>
                            <p className="font-black text-[12px] opacity-20 tracking-[0.5em] uppercase hover:opacity-100 cursor-default transition-opacity">
                                {formData?.footerText || "Created via SuperProfile Premium"}
                            </p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Policy Content Modal */}
            {policyModal && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-8 animate-in fade-in duration-300">
                    <button
                        type="button"
                        aria-label="Close policy modal"
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setPolicyModal(null)}
                    />
                    <div className="relative w-full max-w-3xl max-h-[85vh] rounded-[32px] bg-white shadow-[0_40px_120px_-24px_rgba(0,0,0,0.45)] border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.35em]">Policy</p>
                                <h3 className="text-2xl font-black text-gray-900">{policyModal.title}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPolicyModal(null)}
                                className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="px-8 py-6 overflow-y-auto max-h-[calc(85vh-96px)]">
                            <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                                {policyModal.content}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 overflow-y-auto animate-in fade-in duration-300">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl" onClick={() => checkoutStep !== "verifying" && setShowCheckout(false)} />

                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] md:rounded-[64px] shadow-[0_48px_128px_-32px_rgba(0,0,0,0.5)] my-auto animate-in zoom-in-95 slide-in-from-bottom-20 duration-700 font-sans border border-white/20 p-1 bg-gradient-to-b from-white to-slate-50 overflow-visible">
                        {checkoutStep !== "success" && (
                            <button
                                onClick={() => setShowCheckout(false)}
                                className="absolute top-10 right-10 p-4 hover:bg-slate-100 rounded-full transition-colors z-20 group"
                            >
                                <X size={24} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                            </button>
                        )}

                        <div className="p-10 md:p-16">
                            {checkoutStep === "info" && (
                                <div className="space-y-10">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/5 border border-slate-900/10 rounded-full">
                                                <Lock size={12} className="text-slate-900" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Secure Environment</span>
                                            </div>
                                            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 leading-tight">Checkout</h2>
                                            <p className="text-slate-500 font-bold text-lg leading-relaxed max-w-sm">
                                                Complete verification to access <span className="text-slate-900 font-black underline underline-offset-4 decoration-slate-200">{selectedProduct?.title || formData.title}</span>
                                            </p>
                                        </div>
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 shadow-sm hidden md:flex">
                                            <ShoppingBag size={32} className="text-slate-200" />
                                        </div>
                                    </div>

                                    {(formData.pricingType === 'decide' || formData.pricingType === 'customer') && (
                                        <div className="space-y-4 p-8 bg-slate-50/50 border border-slate-100 rounded-[32px] animate-in slide-in-from-top-4 duration-500">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Set your own price</label>
                                            <div className="relative group/input">
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-slate-900 transition-colors">
                                                    <span className="text-2xl font-black">₹</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={customAmount}
                                                    onChange={e => setCustomAmount(e.target.value)}
                                                    className="w-full pl-16 pr-6 py-6 bg-white border-2 border-slate-100 focus:border-slate-900 rounded-[24px] text-3xl font-black outline-none transition-all shadow-sm group-hover/input:border-slate-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        {/* Recipient Email */}
                                        <div className="space-y-3 group/field">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] group-focus-within/field:text-slate-900 transition-colors">Recipient Email</label>
                                                {emailVerified && <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in zoom-in duration-300"><Check size={12} strokeWidth={4} /> Verified</span>}
                                            </div>
                                            <div className="relative group/input">
                                                <div className={`absolute left-6 top-1/2 -translate-y-1/2 transition-all duration-300 ${emailVerified ? 'text-emerald-500' : 'text-slate-300 group-focus-within/input:text-slate-950 group-hover/input:scale-110'}`}>
                                                    <Mail size={22} strokeWidth={emailVerified ? 3 : 2} />
                                                </div>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    disabled={emailVerified}
                                                    className={`w-full pl-16 pr-32 py-6 bg-slate-50 border-2 border-slate-100 transition-all duration-500 rounded-[28px] text-lg font-bold text-slate-900 outline-none shadow-sm ${emailVerified ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950' : 'focus:border-slate-900 focus:bg-white focus:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)]'}`}
                                                    placeholder="alex@example.com"
                                                />
                                                {formData.emailVerification && !emailVerified && email && !showEmailOtp && (
                                                    <button
                                                        onClick={verifyEmail}
                                                        disabled={verifyingEmail}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-8 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-lg"
                                                    >
                                                        {verifyingEmail ? <RefreshCw className="animate-spin" size={14} /> : "Verify"}
                                                    </button>
                                                )}
                                            </div>

                                            {showEmailOtp && (
                                                <div className="pt-2 animate-in slide-in-from-top-6 duration-700">
                                                    <div className="bg-slate-50 p-6 md:p-8 rounded-[40px] shadow-inner border border-slate-100 space-y-6 relative overflow-visible">
                                                        <div className="space-y-1 text-center">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Confirmation Code</p>
                                                            <p className="text-slate-500 text-xs font-medium">Check your inbox for the 4-digit key</p>
                                                        </div>
                                                        <div className="flex flex-col gap-3 relative z-10 max-w-xs mx-auto">
                                                            <input
                                                                type="text"
                                                                maxLength={4}
                                                                value={emailOtp}
                                                                onChange={e => setEmailOtp(e.target.value)}
                                                                className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-[24px] text-center text-3xl font-black text-slate-950 outline-none focus:border-slate-900 transition-all shadow-sm"
                                                                placeholder="0000"
                                                            />
                                                            <button
                                                                onClick={confirmEmailOtp}
                                                                className="w-full bg-slate-950 text-white py-5 rounded-[24px] font-black text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                                                            >
                                                                Verify & Unlock
                                                            </button>
                                                        </div>
                                                        <div className="text-center">
                                                            <button onClick={() => setShowEmailOtp(false)} className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-900 transition-colors">Entered wrong email?</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Phone Verification */}
                                        {formData.phoneVerification && (
                                            <div className="space-y-3 group/field animate-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] group-focus-within/field:text-slate-900">Mobile Number</label>
                                                    {phoneVerified && <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in zoom-in duration-300"><Check size={12} strokeWidth={4} /> Verified</span>}
                                                </div>
                                                <div className="relative group/input">
                                                    <div className={`absolute left-6 top-1/2 -translate-y-1/2 transition-all duration-300 ${phoneVerified ? 'text-emerald-500' : 'text-slate-300 group-focus-within/input:text-slate-950 group-hover:scale-110'}`}>
                                                        <Phone size={22} strokeWidth={phoneVerified ? 3 : 2} />
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={e => setPhone(e.target.value)}
                                                        disabled={phoneVerified}
                                                        className="w-full pl-16 pr-32 py-6 bg-slate-50 border-2 border-slate-100 transition-all duration-500 rounded-[24px] text-lg font-bold text-slate-950 outline-none shadow-sm disabled:bg-emerald-50/10 focus:border-slate-900 focus:bg-white focus:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)]"
                                                        placeholder="+91 00000 00000"
                                                    />
                                                    {!phoneVerified && phone && !showPhoneOtp && (
                                                        <button
                                                            onClick={verifyPhone}
                                                            disabled={verifyingPhone}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-8 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-lg"
                                                        >
                                                            {verifyingPhone ? <RefreshCw className="animate-spin" size={14} /> : "Get OTP"}
                                                        </button>
                                                    )}
                                                </div>

                                                {showPhoneOtp && (
                                                    <div className="pt-2 animate-in slide-in-from-top-4 duration-500">
                                                        <div className="bg-slate-50 p-6 md:p-8 rounded-[40px] shadow-inner border border-slate-100 space-y-6 relative overflow-visible">
                                                            <div className="space-y-1 text-center">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">One-Time Password</p>
                                                                <p className="text-slate-500 text-xs font-medium">Sent to your mobile device</p>
                                                            </div>
                                                            <div className="flex flex-col gap-3 relative z-10 max-w-xs mx-auto">
                                                                <input
                                                                    type="text"
                                                                    maxLength={4}
                                                                    value={phoneOtp}
                                                                    onChange={e => setPhoneOtp(e.target.value)}
                                                                    className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-[24px] text-center text-3xl font-black text-slate-950 outline-none focus:border-slate-900 transition-all shadow-sm"
                                                                    placeholder="0000"
                                                                />
                                                                <button
                                                                    onClick={confirmPhoneOtp}
                                                                    className="w-full bg-slate-950 text-white py-5 rounded-[24px] font-black text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                                                                >
                                                                    Verify OTP
                                                                </button>
                                                            </div>
                                                            <div className="text-center">
                                                                <button onClick={() => setShowPhoneOtp(false)} className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-900 transition-colors">Different info?</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-10 relative group/btn">
                                        <button
                                            onClick={handlePayment}
                                            disabled={!canComplete()}
                                            className={`w-full py-8 rounded-[32px] font-black text-xl transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex items-center justify-center gap-4 relative overflow-hidden ${canComplete() ? 'bg-slate-900 text-white hover:scale-[1.02] hover:-translate-y-1 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                                            style={canComplete() ? { backgroundColor: brandColor } : {}}
                                        >
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                            <span className="relative flex items-center gap-3">
                                                Complete Purchase • ₹{
                                                    (() => {
                                                        const basePrice = Number(selectedProduct?.price || customAmount || formData?.price || 0);
                                                        const gstPercent = parseInt(formData?.gstOnPrice?.replace('%', '') || '0');
                                                        const final = basePrice + (basePrice * gstPercent / 100);
                                                        return final.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                                                    })()
                                                }
                                                <ArrowRight size={24} strokeWidth={3} className="group-hover/btn:translate-x-1.5 transition-transform" />
                                            </span>
                                        </button>
                                        {formData?.gstOnPrice && (
                                            <p className="text-center text-[10px] font-black text-slate-400 mt-5 uppercase tracking-[0.3em]">Secure Transaction • Inclusive of {formData.gstOnPrice} GST</p>
                                        )}
                                        <p className="text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mt-8 flex items-center justify-center gap-3 bg-slate-50/50 py-3 rounded-full border border-slate-100 w-fit mx-auto px-8">
                                            <ShieldCheck size={14} className="text-emerald-500" /> AES-256 Bit Encryption
                                        </p>
                                    </div>
                                </div>
                            )}

                            {checkoutStep === "success" && (
                                <div className="py-12 flex flex-col items-center text-center space-y-12 animate-in zoom-in-95 duration-1000">
                                    {formData.customRedirectToggle && formData.customRedirectUrl ? (
                                        <div className="space-y-8">
                                            <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl mx-auto animate-pulse">
                                                <RefreshCw size={40} className="animate-spin" />
                                            </div>
                                            <div className="space-y-4">
                                                <h2 className="text-3xl font-black">Redirecting you...</h2>
                                                <p className="text-slate-500 font-bold">Please wait while we take you to your destination.</p>
                                            </div>
                                            {(() => {
                                                setTimeout(() => {
                                                    window.location.href = formData.customRedirectUrl!.startsWith('http') ? formData.customRedirectUrl! : `https://${formData.customRedirectUrl}`;
                                                }, 3000);
                                                return null;
                                            })()}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-32 h-32 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center shadow-[0_40px_80px_-20px_rgba(16,185,129,0.5)] rotate-6 animate-in zoom-in duration-700">
                                                <Check size={64} strokeWidth={4} />
                                            </div>
                                            <div className="space-y-6">
                                                <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-950 leading-[0.9]">
                                                    {formData.successMessageTitle || "Experience Unlocked"}
                                                </h2>
                                                <p className="text-slate-500 font-bold text-xl leading-relaxed max-w-sm mx-auto">
                                                    {formData.successMessage || (
                                                        <>Your access credentials have been dispatched to <span className="text-slate-950 underline underline-offset-4 decoration-emerald-500/30">{email}</span>.</>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="w-full pt-8 px-4 space-y-4">
                                                {formData.digitalFilesLink && (
                                                    <button
                                                        onClick={() => {
                                                            window.open(formData.digitalFilesLink!.startsWith('http') ? formData.digitalFilesLink : `https://${formData.digitalFilesLink}`, '_blank');
                                                        }}
                                                        className="w-full py-8 rounded-[32px] bg-slate-950 text-white font-black text-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all shadow-2xl relative overflow-hidden group/success"
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/success:opacity-100 transition-opacity" />
                                                        <span className="relative">Download Resources</span>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setShowCheckout(false)}
                                                    className="w-full py-4 rounded-[24px] bg-white border border-slate-100 text-slate-400 font-bold text-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Transaction: #SP-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        </div>
    );
}
