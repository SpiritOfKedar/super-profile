"use client";

import {
   X, ChevronDown, Check, Upload, Bold, Italic, Underline, AlignLeft,
   List as ListIcon, Trash2, Edit3, Globe, Copy, RefreshCw, Plus,
   Users,
   Mail, Phone, Twitter, ExternalLink
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { FormData } from "@/lib/types";
import { readStringArrayField } from "@/lib/builder/form-dynamic";
import { getErrorMessage, logError } from "@/lib/error-utils";
import { persistListPublish, syncPublishedWebsiteIndex } from "@/lib/builder/publish";
import { uploadWithOptimistic } from "@/lib/builder/upload";

interface ListProductFlowProps {
   formData: FormData;
   patchFormData: (patch: Partial<FormData>) => void;
   updateFormData: (updater: (prev: FormData) => FormData) => void;
   step: number;
   subStep: number;
   onNext: () => void;
   onBack: () => void;
   onCancel: () => void;
   isLive: boolean;
   setIsLive: (val: boolean) => void;
   setSubStep: (val: number) => void;
}

export default function ListProductFlow({
   formData, patchFormData, updateFormData, step, subStep, onNext, onBack, onCancel, isLive, setIsLive, setSubStep
}: ListProductFlowProps) {
   // subStep is handled by parent now

   const [isPublishing, setIsPublishing] = useState(false);
   const [publishingStep, setPublishingStep] = useState(0);
   const [isUploading, setIsUploading] = useState(false);
   const [publishWarning, setPublishWarning] = useState<string | null>(null);
   const [currentHost, setCurrentHost] = useState("");
   const [currentUsername, setCurrentUsername] = useState("");
   const [publishedPath, setPublishedPath] = useState("");
   const [tempImageUrl, setTempImageUrl] = useState("");
   const [tempGalleryLink, setTempGalleryLink] = useState("");
   const [tempTestimonialLink, setTempTestimonialLink] = useState("");
   const [expandedSection, setExpandedSection] = useState<string | null>(null);
   const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

   useEffect(() => {
      if (typeof window !== "undefined") {
         setCurrentHost(window.location.origin);
      }
   }, []);

   useEffect(() => {
      fetch("/api/auth/session")
         .then((res) => res.json())
         .then((data) => {
            if (data?.authenticated && data?.user?.username) {
               setCurrentUsername(data.user.username);
            }
         })
         .catch(() => undefined);
   }, []);

   const normalizeImageUrl = (raw: string): string => {
      const trimmed = raw.trim();
      if (!trimmed) return "";
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
   };

   const handlePublish = async () => {
      setIsPublishing(true);
      setPublishWarning(null);
      const steps = ["Optimizing product list...", "Generating collection page...", "Securing checkout flows...", "Publishing to global CDN..."];

      for (let i = 0; i < steps.length; i++) {
         setPublishingStep(i);
         await new Promise(resolve => setTimeout(resolve, 800));
      }

      const { websiteEntry } = persistListPublish(formData);

      const syncResult = await syncPublishedWebsiteIndex(formData, websiteEntry);

      setIsPublishing(false);
      if (!syncResult.synced) {
         const message = syncResult.errorMessage || "Failed to publish";
         setPublishWarning(message);
         alert(`Saved locally, but cloud publish failed: ${message}`);
         return;
      }

      const livePath = syncResult.publicPath || `/p/${websiteEntry.slug || "my-collection"}`;
      setPublishedPath(livePath);
      if (websiteEntry.slug) {
         const rawList = localStorage.getItem("websites_list");
         if (rawList) {
            const list = JSON.parse(rawList) as Array<{ slug?: string; ownerUsername?: string; publicPath?: string }>;
            const next = list.map((item) => item.slug === websiteEntry.slug ? { ...item, ownerUsername: syncResult.ownerUsername, publicPath: livePath } : item);
            localStorage.setItem("websites_list", JSON.stringify(next));
         }
         if (syncResult.ownerUsername) {
            const savedRaw = localStorage.getItem(`website_${websiteEntry.slug}`);
            if (savedRaw) {
               localStorage.setItem(`website_${syncResult.ownerUsername}_${websiteEntry.slug}`, savedRaw);
            }
         }
      }

      setIsLive(true);
   };

   if (isPublishing) {
      const steps = ["Optimizing product list...", "Generating collection page...", "Securing checkout flows...", "Publishing to global CDN..."];
      return (
         <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-12 overflow-hidden font-sans">
            <div className="relative w-full max-w-lg flex flex-col items-center">
               <div className="w-24 h-24 mb-10 relative">
                  <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <RefreshCw className="text-black animate-pulse" size={32} />
                  </div>
               </div>

               <div className="space-y-4 text-center">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Publishing Page</h2>
                  <div className="flex flex-col items-center gap-3">
                     <p className="text-gray-400 font-bold text-lg animate-pulse">{steps[publishingStep]}</p>
                     <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                           className="h-full bg-black transition-all duration-500 rounded-full"
                           style={{ width: `${((publishingStep + 1) / steps.length) * 100}%` }}
                        />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   }

   if (isLive) {
      const slug = formData.customPageUrl || formData.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || "my-collection";
      const livePath = publishedPath || (currentUsername ? `/u/${currentUsername}/p/${slug}` : `/p/${slug}`);
      return (
         <div className="fixed inset-0 z-[100] bg-white animate-in fade-in duration-500 flex flex-col items-center justify-center p-12">
            <div className="max-w-xl w-full flex flex-col items-center text-center space-y-8 py-12">
               <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Check className="text-green-600" size={40} strokeWidth={3} />
               </div>
               <div className="space-y-4">
                  <h1 className="text-[40px] font-black tracking-tighter leading-[1] text-gray-900 font-sans">Your collection is live!</h1>
                  <p className="text-gray-400 font-bold text-lg leading-relaxed max-w-sm mx-auto">Awesome! Your product list has been successfully published and is ready to share.</p>
               </div>
               <div className="w-full space-y-3 pt-4">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">Public URL</p>
                  <div className="flex items-center p-1.5 bg-gray-50 rounded-[30px] border border-gray-100 shadow-inner group/url">
                     <a
                        href={livePath}
                        target="_blank"
                        className="flex-1 px-6 py-4 font-bold text-blue-600 text-[14px] overflow-hidden text-ellipsis whitespace-nowrap hover:underline decoration-2 underline-offset-4"
                     >
                        {currentHost.replace(/^https?:\/\//, '')}{livePath}
                     </a>
                     <button
                        onClick={() => {
                           navigator.clipboard.writeText(`${currentHost}${livePath}`);
                        }}
                        className="px-6 py-4 bg-white rounded-[24px] font-black text-[12px] shadow-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2 group border border-gray-100"
                     >
                        <Copy size={16} className="text-gray-400 group-hover:text-black" /> Copy
                     </button>
                  </div>
               </div>
               <div className="flex w-full gap-4 pt-6">
                  <button
                     onClick={() => window.open(livePath, '_blank')}
                     className="flex-1 bg-black text-white py-5 rounded-[30px] font-black text-base shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3"
                  >
                     <Globe size={20} /> Preview
                  </button>
                  <button onClick={() => setIsLive(false)} className="px-10 py-5 bg-white border border-gray-100 rounded-[30px] font-black text-base shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-700">
                     <Edit3 size={20} /> Edit
                  </button>
               </div>
               <button
                  onClick={() => {
                     setIsLive(false);
                     onCancel();
                  }}
                  className="text-[12px] font-black text-gray-300 hover:text-black transition-all uppercase tracking-[0.2em] pt-8"
               >
                  Done, Back to Home
               </button>
            </div>
         </div>
      );
   }

   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, isArray: boolean = false) => {
      const file = e.target.files?.[0];
      if (file) {
         setIsUploading(true);
         try {
            await uploadWithOptimistic({
               file,
               uploadKey: field,
               applyLocal: (localUrl) => {
                  if (isArray) {
                     const currentArr = readStringArrayField(formData, field);
                     patchFormData({ [field]: [...currentArr, localUrl] } as Partial<FormData>);
                  } else {
                     patchFormData({ [field]: localUrl } as Partial<FormData>);
                  }
               },
               applyRemote: (remoteUrl, localUrl) => {
                  updateFormData((prev: FormData) => {
                     if (isArray) {
                        const currentArr = readStringArrayField(prev, field);
                        return { ...prev, [field]: currentArr.map((url: string) => url === localUrl ? remoteUrl : url) };
                     }

                     return { ...prev, [field]: remoteUrl };
                  });
               }
            });
         } catch (err) {
            logError("list flow image upload", err);
            alert(getErrorMessage(err, "Failed to upload image."));
         } finally {
            setIsUploading(false);
         }
      }
   };

   const wrapDescriptionSelection = (prefix: string, suffix: string = prefix) => {
      const textarea = descriptionRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value || "";
      const selected = text.slice(start, end);
      const nextText = `${text.slice(0, start)}${prefix}${selected}${suffix}${text.slice(end)}`;
      const cursorPos = selected.length > 0 ? end + prefix.length + suffix.length : start + prefix.length;

      patchFormData({ description: nextText });

      window.requestAnimationFrame(() => {
         textarea.focus();
         textarea.setSelectionRange(cursorPos, cursorPos);
      });
   };

   return (
      <div className="min-h-screen overflow-x-hidden bg-[#FDFDFD] text-[#1A1A1A] font-sans">
         {/* Header */}
         <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-gray-100 bg-white px-3 sm:h-20 sm:px-6 lg:px-10">
            <div className="flex h-full items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
               <span className="text-[14px] font-black text-gray-900">New Page</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
               <div className="hidden items-center gap-1.5 sm:flex">
                  <div className="flex gap-1">
                     {[1, 2, 3].map(i => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${step === i ? "bg-black" : "bg-gray-200"}`} />
                     ))}
                  </div>
                  <span className="text-[12px] font-black text-gray-900 ml-2">Step {step} - {step === 1 ? "Page" : step === 2 ? "Checkout" : "Settings"}</span>
               </div>
               <button onClick={handlePublish} className="rounded-full bg-black px-3 py-2 text-[11px] font-bold text-white transition-all hover:bg-gray-800 sm:px-6 sm:py-2.5 sm:text-[13px]">
                  Publish page
               </button>
               <button onClick={onCancel} className="p-2 hover:bg-gray-50 rounded-full transition-all">
                  <X size={20} className="text-gray-400" />
               </button>
            </div>
            </div>
            {isUploading && (
               <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 animate-pulse" />
            )}
         </header>

         <main className="mx-auto flex max-w-4xl flex-col items-center px-3 pb-36 pt-20 sm:px-4 sm:pb-40 sm:pt-28 lg:px-6">
            {publishWarning && (
               <div className="w-full mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                  Cloud publish failed: {publishWarning}
               </div>
            )}
            {step === 1 ? (
               <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Title Section */}
                  <div className="space-y-3">
                     <div className="flex justify-between items-baseline">
                        <label className="text-[14px] font-black text-gray-900">Website Page Title</label>
                     </div>
                     <div className="relative">
                        <input
                           className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black transition-all shadow-sm"
                           value={formData.title ?? ""}
                           onChange={e => patchFormData({ title: e.target.value })}
                           placeholder="Website Page Title"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-300">28/60</span>
                     </div>
                  </div>

                  {/* Category Section */}
                  <div className="space-y-3">
                     <label className="text-[14px] font-black text-gray-900">Category</label>
                     <div className="relative group">
                        <select
                           className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black transition-all shadow-sm appearance-none cursor-pointer"
                           value={formData.category ?? ""}
                           onChange={e => patchFormData({ category: e.target.value })}
                        >
                           <option value="" disabled>Select a category</option>
                           <option value="digital">Digital Product</option>
                           <option value="service">Services</option>
                           <option value="course">Online Course</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-black transition-colors" />
                     </div>
                  </div>

                  {/* Cover Image Section */}
                  <div className="space-y-3">
                     <label className="text-[14px] font-black text-gray-900">Cover Image</label>
                     <input
                        type="file"
                        id="coverImageInput"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'coverImage')}
                     />
                     <div
                        onClick={() => document.getElementById('coverImageInput')?.click()}
                        className="w-full border-2 border-dashed border-gray-200 rounded-[32px] p-6 bg-white flex flex-col items-center justify-center gap-4 hover:border-black transition-all cursor-pointer group relative overflow-hidden min-h-[240px]"
                     >
                        {formData.coverImage ? (
                           <img src={formData.coverImage} className="absolute inset-0 w-full h-full object-cover" alt="Cover" />
                        ) : (
                           <>
                              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                                 <Upload size={24} className="text-gray-400" />
                              </div>
                              <div className="text-center">
                                 <p className="text-[14px] font-black text-gray-900">Upload Image</p>
                                 <p className="text-[11px] font-bold text-gray-400 mt-1">Recommending 1250px x 1204 or up to 10 mb</p>
                              </div>
                           </>
                        )}
                        <div className="flex items-center gap-4 w-full max-w-sm mt-4 z-10">
                           <div className="h-[1px] flex-1 bg-gray-100" />
                           <span className="text-[11px] font-black text-gray-300">Or</span>
                           <div className="h-[1px] flex-1 bg-gray-100" />
                        </div>
                        <div className="flex items-center gap-2 w-full max-w-sm bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 z-10 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                           <input
                              className="flex-1 bg-transparent px-4 py-2 text-[12px] font-bold outline-none"
                              placeholder="Add the link"
                              value={tempImageUrl}
                              onChange={e => setTempImageUrl(e.target.value)}
                           />
                           <button
                              onClick={() => {
                                 if (tempImageUrl) {
                                    patchFormData({ coverImage: tempImageUrl });
                                    setTempImageUrl("");
                                 }
                              }}
                              className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-black shadow-sm"
                           >
                              Add Link
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-3">
                     <label className="text-[14px] font-black text-gray-900">Description</label>
                     <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50/30">
                           <div className="flex items-center border-r border-gray-100 pr-4 gap-1">
                              <button className="p-1.5 hover:bg-white rounded transition-all"><AlignLeft size={16} className="text-gray-400" /></button>
                              <ChevronDown size={14} className="text-gray-400" />
                           </div>
                           <div className="flex items-center gap-1">
                              <button
                                 type="button"
                                 onMouseDown={(e) => e.preventDefault()}
                                 onClick={() => {
                                    wrapDescriptionSelection("**");
                                 }}
                                 className="p-1.5 hover:bg-white rounded transition-all"
                              >
                                 <Bold size={16} className="text-gray-900" />
                              </button>
                              <button
                                 type="button"
                                 onMouseDown={(e) => e.preventDefault()}
                                 onClick={() => {
                                    wrapDescriptionSelection("_");
                                 }}
                                 className="p-1.5 hover:bg-white rounded transition-all"
                              >
                                 <Italic size={16} className="text-gray-900" />
                              </button>
                              <button
                                 type="button"
                                 onMouseDown={(e) => e.preventDefault()}
                                 onClick={() => {
                                    wrapDescriptionSelection("<u>", "</u>");
                                 }}
                                 className="p-1.5 hover:bg-white rounded transition-all"
                              >
                                 <Underline size={16} className="text-gray-900" />
                              </button>
                           </div>
                        </div>
                        <textarea
                           id="desc-area"
                           ref={descriptionRef}
                           className="w-full h-48 px-6 py-5 text-[14px] font-bold outline-none border-none resize-none placeholder:text-gray-200 font-sans"
                           placeholder="Add description..."
                           value={formData.description ?? ""}
                           onChange={e => patchFormData({ description: e.target.value })}
                        />
                     </div>
                  </div>

                  {/* Optional Sections */}
                  <div className="space-y-6 pt-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
                     <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-widest">Optional Sections</h3>
                     <div className="grid gap-4">
                        {[
                           { id: "gallery", label: "Gallery Showcase" },
                           { id: "testimonial", label: "Customer Testimonials" },
                           { id: "faq", label: "F.A.Q Section" },
                           { id: "aboutUs", label: "Our Story / About" },
                           { id: "footer", label: "Footer & Socials" }
                        ].map((item) => (
                           <div key={item.id} className="space-y-4">
                              <div
                                 onClick={() => setExpandedSection(expandedSection === item.id ? null : item.id)}
                                 className={`flex items-center justify-between p-6 bg-white border rounded-[28px] cursor-pointer transition-all hover:shadow-md ${expandedSection === item.id ? 'border-black shadow-lg' : 'border-gray-100 hover:border-gray-200'}`}
                              >
                                 <div className="flex items-center gap-4">
                                    <span className={`text-[15px] font-black ${expandedSection === item.id ? 'text-black' : 'text-gray-900'}`}>{item.label}</span>
                                 </div>
                                 <ChevronDown size={18} className={`text-gray-400 transition-transform duration-500 ${expandedSection === item.id ? 'rotate-180 text-black' : ''}`} />
                              </div>

                              {expandedSection === item.id && (
                                 <div className="p-8 bg-[#FCFCFD] border border-gray-100 rounded-[32px] space-y-8 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                                    {item.id === "gallery" && (
                                       <div className="space-y-6">
                                          <input
                                             className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm"
                                             placeholder="Gallery Title (e.g. Visual Showcase)"
                                             value={formData.galleryTitle || ""}
                                             onChange={e => patchFormData({ galleryTitle: e.target.value })}
                                          />
                                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-200">
                                             <input
                                                className="flex-1 bg-transparent px-4 py-2 text-[12px] font-bold outline-none"
                                                placeholder="Paste image link"
                                                value={tempGalleryLink}
                                                onChange={(e) => setTempGalleryLink(e.target.value)}
                                             />
                                             <button
                                                type="button"
                                                onClick={() => {
                                                   if (!tempGalleryLink) return;
                                                   const existing = formData.galleryImages || [];
                                                   patchFormData({ galleryImages: [...existing, tempGalleryLink] });
                                                   setTempGalleryLink("");
                                                }}
                                                className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-black shadow-sm"
                                             >
                                                Add Link
                                             </button>
                                          </div>
                                          <div className="grid grid-cols-4 gap-4">
                                             {formData.galleryImages?.map((img: string, i: number) => (
                                                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-200 relative group shadow-sm">
                                                   <img src={img} className="w-full h-full object-cover" />
                                                   <button
                                                      onClick={() => patchFormData({ galleryImages: formData.galleryImages?.filter((_, idx) => idx !== i) })}
                                                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                   >
                                                      <X size={12} />
                                                   </button>
                                                </div>
                                             ))}
                                             <label className="aspect-square border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center bg-white hover:border-black transition-all cursor-pointer group">
                                                <Upload size={20} className="text-gray-300 group-hover:text-black transition-colors" />
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'galleryImages', true)} />
                                             </label>
                                          </div>
                                       </div>
                                    )}

                                    {item.id === "testimonial" && (
                                       <div className="space-y-6">
                                          <div className="flex items-center gap-6">
                                             <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                {formData.testimonialImage ? <img src={formData.testimonialImage} className="w-full h-full object-cover" /> : <Users size={28} className="text-gray-100" />}
                                             </div>
                                             <label className="flex-1 cursor-pointer py-4 border-2 border-dashed border-gray-200 rounded-2xl text-center text-[13px] font-black hover:border-black transition-all bg-white">
                                                Upload Customer Photo
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'testimonialImage')} />
                                             </label>
                                          </div>
                                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-200">
                                             <input
                                                className="flex-1 bg-transparent px-4 py-2 text-[12px] font-bold outline-none"
                                                placeholder="Paste image link"
                                                value={tempTestimonialLink}
                                                onChange={(e) => setTempTestimonialLink(e.target.value)}
                                                onPaste={(e) => {
                                                   const pasted = e.clipboardData.getData("text");
                                                   const normalized = normalizeImageUrl(pasted);
                                                   if (!normalized) return;
                                                   e.preventDefault();
                                                   patchFormData({ testimonialImage: normalized });
                                                   setTempTestimonialLink("");
                                                }}
                                                onKeyDown={(e) => {
                                                   if (e.key !== "Enter") return;
                                                   const normalized = normalizeImageUrl(tempTestimonialLink);
                                                   if (!normalized) return;
                                                   patchFormData({ testimonialImage: normalized });
                                                   setTempTestimonialLink("");
                                                }}
                                             />
                                             <button
                                                type="button"
                                                onClick={() => {
                                                   const normalized = normalizeImageUrl(tempTestimonialLink);
                                                   if (!normalized) return;
                                                   patchFormData({ testimonialImage: normalized });
                                                   setTempTestimonialLink("");
                                                }}
                                                className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-black shadow-sm"
                                             >
                                                Add Link
                                             </button>
                                          </div>
                                          <input
                                             className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm"
                                             placeholder="Customer Name"
                                             value={formData.testimonialName || ""}
                                             onChange={e => patchFormData({ testimonialName: e.target.value })}
                                          />
                                          <textarea
                                             className="w-full h-32 px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm resize-none font-sans"
                                             placeholder="Their testimonial message..."
                                             value={formData.testimonialComment || ""}
                                             onChange={e => patchFormData({ testimonialComment: e.target.value })}
                                          />
                                       </div>
                                    )}

                                    {item.id === "faq" && (
                                       <div className="space-y-6">
                                          {formData.faqs?.map((faq, idx) => (
                                             <div key={idx} className="p-6 bg-white border border-gray-100 rounded-[24px] space-y-4 relative group shadow-sm">
                                                <button
                                                   onClick={() => {
                                                      const newFaqs = [...(formData.faqs || [])];
                                                      newFaqs.splice(idx, 1);
                                                      patchFormData({ faqs: newFaqs });
                                                   }}
                                                   className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                   <X size={12} />
                                                </button>
                                                <input
                                                   className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all"
                                                   placeholder="Question"
                                                   value={faq.question}
                                                   onChange={e => {
                                                      const newFaqs = [...(formData.faqs || [])];
                                                      newFaqs[idx].question = e.target.value;
                                                      patchFormData({ faqs: newFaqs });
                                                   }}
                                                />
                                                <textarea
                                                   className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl text-[13px] font-bold outline-none focus:border-black transition-all resize-none font-sans"
                                                   placeholder="Answer"
                                                   value={faq.answer}
                                                   onChange={e => {
                                                      const newFaqs = [...(formData.faqs || [])];
                                                      newFaqs[idx].answer = e.target.value;
                                                      patchFormData({ faqs: newFaqs });
                                                   }}
                                                />
                                             </div>
                                          ))}
                                          <button
                                             onClick={() => patchFormData({ faqs: [...(formData.faqs || []), { question: "", answer: "" }] })}
                                             className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[24px] text-[13px] font-black text-gray-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 bg-white"
                                          >
                                             <Plus size={16} /> Add FAQ
                                          </button>
                                       </div>
                                    )}

                                    {item.id === "aboutUs" && (
                                       <textarea
                                          className="w-full h-48 px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm resize-none font-sans"
                                          placeholder="Share your story, mission, and background..."
                                          value={formData.aboutUs || ""}
                                          onChange={e => patchFormData({ aboutUs: e.target.value })}
                                       />
                                    )}

                                    {item.id === "footer" && (
                                       <div className="space-y-6">
                                          <input
                                             className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm"
                                             placeholder="Footer Copyright Text"
                                             value={formData.footerText || ""}
                                             onChange={e => patchFormData({ footerText: e.target.value })}
                                          />
                                          <div className="grid grid-cols-2 gap-4">
                                             <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                   className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                   placeholder="Instagram handle"
                                                   value={formData.socialInstagram || ""}
                                                   onChange={e => patchFormData({ socialInstagram: e.target.value })}
                                                />
                                             </div>
                                             <div className="relative">
                                                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input
                                                   className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-[13px] font-bold outline-none focus:border-black shadow-sm"
                                                   placeholder="Twitter handle"
                                                   value={formData.socialTwitter || ""}
                                                   onChange={e => patchFormData({ socialTwitter: e.target.value })}
                                                />
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
            ) : step === 2 ? (
               <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Stepper for Step 2 */}
                  <div className="w-full bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm space-y-10">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-12">
                           <div className="flex items-center gap-3 group transition-all">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black transition-all ${subStep >= 1 ? "bg-blue-600/10 text-blue-600 border border-blue-600/20 shadow-inner" : "bg-gray-50 text-gray-400"}`}>1</div>
                              <span className={`text-[14px] font-black transition-all ${subStep === 1 ? "text-blue-600 underline underline-offset-8" : "text-gray-400"}`}>Digital Files | 1 media</span>
                           </div>
                           <div className="flex items-center gap-3 group transition-all">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black transition-all ${subStep >= 2 ? "bg-blue-600/10 text-blue-600 border border-blue-600/20 shadow-inner" : "bg-gray-50 text-gray-400"}`}>2</div>
                              <span className={`text-[14px] font-black transition-all ${subStep === 2 ? "text-blue-600 underline underline-offset-8" : "text-gray-400"}`}>Product Details</span>
                           </div>
                           <div className="flex items-center gap-3 group transition-all">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black transition-all ${subStep >= 3 ? "bg-blue-600/10 text-blue-600 border border-blue-600/20 shadow-inner" : "bg-gray-50 text-gray-400"}`}>3</div>
                              <span className={`text-[14px] font-black transition-all ${subStep === 3 ? "text-blue-600 underline underline-offset-8" : "text-gray-400"}`}>Price Fixing</span>
                           </div>
                        </div>
                     </div>

                     {subStep === 1 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center text-[10px] font-black bg-white shadow-sm">1</div>
                                 <label className="text-[14px] font-black text-gray-900">What Is Payment Page for ?</label>
                              </div>
                              <div className="relative group">
                                 <select
                                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black transition-all shadow-sm appearance-none cursor-pointer"
                                    value={formData.paymentPageFor || "digital"}
                                    onChange={e => patchFormData({ paymentPageFor: e.target.value })}
                                 >
                                    <option value="link">Website Link</option>
                                    <option value="digital">Single or multiple digital files</option>
                                 </select>
                                 <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors group-hover:text-black" />
                              </div>
                           </div>

                           {formData.paymentPageFor === 'link' ? (
                              <div className="space-y-3">
                                 <label className="text-[13px] font-black text-gray-900 sm:ml-9">URL</label>
                                 <input
                                    className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-[14px] font-bold outline-none shadow-sm transition-all focus:border-black sm:ml-9 sm:w-[calc(100%-36px)]"
                                    placeholder="Add Website Link"
                                    value={formData.websiteLink ?? ""}
                                    onChange={e => patchFormData({ websiteLink: e.target.value })}
                                 />
                              </div>
                           ) : (
                              <div className="space-y-3">
                                 <label className="text-[13px] font-black text-gray-900 sm:ml-9">Cover Image</label>
                                 <input
                                    type="file"
                                    id="digitalFileImageInput"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'digitalFilesImage')}
                                 />
                                 <div
                                    onClick={() => document.getElementById('digitalFileImageInput')?.click()}
                                    className="relative flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border-2 border-dashed border-gray-200 bg-white p-4 transition-all group hover:border-black sm:ml-9 sm:min-h-[240px] sm:w-[calc(100%-36px)] sm:p-6"
                                 >
                                    {formData.digitalFilesImage ? (
                                       <img src={formData.digitalFilesImage} className="absolute inset-0 w-full h-full object-cover" alt="Digital File" />
                                    ) : (
                                       <>
                                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                             <Upload size={20} className="text-gray-400" />
                                          </div>
                                          <div className="text-center">
                                             <p className="text-[14px] font-black text-gray-900">Upload Image</p>
                                             <p className="text-[10px] font-bold text-gray-400 mt-1">Recommending 1250px x 1204 or up to 10 mb</p>
                                          </div>
                                       </>
                                    )}
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     {subStep === 2 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-6 h-6 rounded-full border border-gray-100 flex items-center justify-center text-[10px] font-black bg-white shadow-sm">1</div>
                                 <label className="text-[14px] font-black text-gray-900">Product Name</label>
                              </div>
                              <input
                                 className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-[14px] font-bold outline-none focus:border-black transition-all shadow-sm"
                                 placeholder="Enter Product Name"
                                 value={formData.productTitle ?? ""}
                                 onChange={e => patchFormData({ productTitle: e.target.value })}
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[14px] font-black text-gray-900 sm:ml-9">Product descriptions</label>
                              <textarea
                                 className="h-32 w-full rounded-xl border border-gray-200 bg-white px-5 py-4 font-sans text-[14px] font-bold outline-none shadow-sm resize-none focus:border-black sm:ml-9 sm:w-[calc(100%-36px)]"
                                 placeholder="Descriptions"
                                 value={formData.productDescription ?? ""}
                                 onChange={e => patchFormData({ productDescription: e.target.value })}
                              />
                           </div>
                        </div>
                     )}

                     {subStep === 3 && (
                        <div className="space-y-10 animate-in fade-in duration-300 relative">
                           {/* Pricing Options */}
                           <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-[12px] font-black bg-white shadow-sm">3</div>
                                 <label className="text-[15px] font-black text-gray-900">Pricing & Settings</label>
                              </div>

                              <div className="ml-0 grid grid-cols-1 gap-x-12 gap-y-4 sm:ml-11 sm:grid-cols-2 sm:gap-y-6">
                                 {[
                                    { id: "fixed", label: "Fixed price" },
                                    { id: "quantity", label: "Price per quantity" },
                                    { id: "customer", label: "Customers decide a price" },
                                    { id: "free", label: "Free" }
                                 ].map((opt) => (
                                    <label key={opt.id} className="flex items-center gap-4 cursor-pointer group">
                                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.pricingType === opt.id ? "border-black" : "border-gray-200 group-hover:border-gray-400"}`}>
                                          {formData.pricingType === opt.id && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                                       </div>
                                       <input
                                          type="radio"
                                          className="hidden"
                                          name="pricing"
                                          checked={formData.pricingType === opt.id}
                                          onChange={() => patchFormData({ pricingType: opt.id })}
                                       />
                                       <span className={`text-[14px] font-bold ${formData.pricingType === opt.id ? "text-black" : "text-gray-500"}`}>{opt.label}</span>
                                    </label>
                                 ))}
                              </div>

                              <div className="ml-0 space-y-6 pt-4 sm:ml-11">
                                 <div className="relative max-w-md">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                    <input
                                       className="w-full pl-10 pr-5 py-4 bg-white border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm"
                                       placeholder="Enter Price"
                                       value={formData.price ?? ""}
                                       onChange={e => patchFormData({ price: e.target.value })}
                                    />
                                 </div>

                                 <label className="flex items-center gap-3 cursor-pointer group max-w-fit">
                                    <div className="w-5 h-5 rounded border-2 border-gray-200 flex items-center justify-center transition-all group-hover:border-black">
                                       <input
                                          type="checkbox"
                                          className="hidden"
                                          checked={formData.pppEnabled}
                                          onChange={() => patchFormData({ pppEnabled: !formData.pppEnabled })}
                                       />
                                       {formData.pppEnabled && <Check size={14} className="text-black" strokeWidth={4} />}
                                    </div>
                                    <span className="text-[13px] font-bold text-gray-600">Offer discounted price on selling price</span>
                                 </label>

                                 {formData.pppEnabled && (
                                    <div className="relative max-w-md animate-in slide-in-from-top-2 duration-300">
                                       <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                       <input
                                          className="w-full pl-10 pr-5 py-4 bg-white border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:border-black shadow-sm"
                                          placeholder="Enter Discount Price"
                                          value={formData.discountPrice ?? ""}
                                          onChange={e => patchFormData({ discountPrice: e.target.value })}
                                       />
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* List of Added Products */}
                           <div className="space-y-4">
                              {formData.products?.map((prod, idx) => (
                                 <div key={prod.id} className="group relative ml-0 flex flex-col gap-4 rounded-[28px] border border-gray-100 bg-white p-4 transition-all duration-500 hover:shadow-xl sm:rounded-[40px] sm:p-8 md:-mx-4 md:flex-row md:items-center md:gap-6">
                                    <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden border border-gray-50 shadow-sm flex-shrink-0">
                                       {prod.image ? <img src={prod.image} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ListIcon size={30} className="text-gray-200" /></div>}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                       <h4 className="text-[15px] font-black text-gray-900 break-words">{prod.title}</h4>
                                       <p className="text-[12px] font-bold text-gray-400">Digital Files | 1 media</p>
                                       <div className="flex items-center gap-2 pt-1">
                                          <span className="text-[14px] font-black">₹{prod.price}</span>
                                       </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                       <button
                                          onClick={() => {
                                             const newProducts = [...(formData.products || [])];
                                             newProducts.splice(idx, 1);
                                             patchFormData({ products: newProducts });
                                          }}
                                          className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:shadow-md transition-all"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </div>
                                 </div>
                              ))}

                              {/* Current Product Card (Preview) */}
                              <div className="group relative ml-0 mt-8 flex flex-col gap-4 rounded-[28px] border border-gray-100 bg-gray-50/50 p-4 transition-all duration-500 hover:bg-white hover:shadow-xl sm:mt-12 sm:rounded-[40px] sm:p-8 md:-mx-4 md:flex-row md:items-center md:gap-6">
                                 <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
                                    {formData.digitalFilesImage ? <img src={formData.digitalFilesImage} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ListIcon size={30} className="text-gray-200" /></div>}
                                 </div>
                                 <div className="flex-1 space-y-1">
                                    <h4 className="text-[15px] font-black text-gray-900 break-words">{formData.productTitle || formData.title || "My Class Food"}</h4>
                                    <p className="text-[12px] font-bold text-gray-400">Digital Files | 1 media</p>
                                    <p className="text-[12px] font-bold text-gray-400">Unlimited stock</p>
                                    <div className="flex items-center gap-2 pt-1">
                                       <span className="text-[14px] font-black">₹{formData.price || "99"}</span>
                                       {formData.discountPrice && <span className="text-[12px] font-bold text-gray-300 line-through">₹{formData.price}</span>}
                                       <span className="text-[11px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-md">(50% off)</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center justify-end gap-2">
                                    <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-black hover:shadow-md transition-all"><Edit3 size={16} /></button>
                                    <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-500 hover:shadow-md transition-all"><Trash2 size={16} /></button>
                                 </div>
                                 <div className="absolute -left-3 top-1/2 hidden -translate-y-1/2 flex-col gap-1 md:flex">
                                    <ChevronDown size={14} className="text-gray-300 -rotate-180" />
                                    <ChevronDown size={14} className="text-gray-300" />
                                 </div>

                                 <div className="relative left-0 -bottom-0 z-10 mt-2 flex items-center gap-3 rounded-xl border border-gray-50 bg-white px-4 py-2 shadow-sm md:absolute md:left-10 md:-bottom-12 md:mt-0">
                                    <div className="w-4 h-4 border-2 border-gray-200 rounded flex items-center justify-center">
                                       <input type="checkbox" className="hidden" checked={formData.compulsoryBuy} onChange={() => patchFormData({ compulsoryBuy: !formData.compulsoryBuy })} />
                                       {formData.compulsoryBuy && <Check size={10} strokeWidth={4} />}
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-500">Make this compulsory to buy</span>
                                 </div>
                              </div>
                           </div>

                           {/* Add Another Product Button */}
                           <div className="flex justify-center pt-20 pb-10">
                              <button
                                 onClick={() => {
                                    if (!formData.price) return;
                                    const newProduct = {
                                       id: Math.random().toString(36).substr(2, 9),
                                       title: formData.productTitle || formData.title || "Untitled Product",
                                       price: formData.price,
                                       description: formData.productDescription || "",
                                       image: formData.digitalFilesImage
                                    };
                                    patchFormData({ products: [...(formData.products || []), newProduct],
                                       // Only reset product-specific fields, keep page title!
                                       productTitle: "",
                                       price: "",
                                       productDescription: "",
                                       digitalFilesImage: "",
                                       discountPrice: "",
                                       pppEnabled: false
                                    });
                                    setSubStep(1);
                                 }}
                                 className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-200 rounded-3xl text-[14px] font-black text-gray-400 hover:border-black hover:text-black transition-all group"
                              >
                                 <Plus size={18} className="group-hover:scale-110 transition-transform" />
                                 Add another product
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            ) : step === 3 ? (
               <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  {/* Color Section */}
                  <div className="space-y-4">
                     <label className="text-[14px] font-black text-gray-900">Colour</label>
                     <div className="w-full flex items-center px-5 py-4 bg-white border border-gray-100 rounded-xl shadow-sm group focus-within:border-black transition-all">
                        <input
                           className="flex-1 bg-transparent outline-none text-[14px] font-bold text-gray-900 placeholder:text-gray-300"
                           placeholder="Select Colour"
                           value={formData.brandColor ?? ""}
                           onChange={e => patchFormData({ brandColor: e.target.value })}
                        />
                        <div className="flex items-center gap-2">
                           <input
                              type="color"
                              className="w-12 h-6 border-none cursor-pointer bg-transparent"
                              value={formData.brandColor ?? "#000000"}
                              onChange={e => patchFormData({ brandColor: e.target.value })}
                           />
                           <div
                              className="w-12 h-6 rounded-md shadow-inner border border-gray-100"
                              style={{ backgroundColor: formData.brandColor || "#000000" }}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8 pt-4">
                     {([
                        { id: 'darkTheme' as const, title: 'Dark Theme', sub: 'Switch to a premium dark aesthetic for your entire page.' },
                        { id: 'deactivateSales' as const, title: 'Deactivate Sales', sub: 'Temporarily stop accepting new orders while keeping the page live.' },
                        { id: 'pageExpiry' as const, title: 'Page Expiry', sub: 'Automatically hide the buy buttons after a specific date.' },
                        { id: 'trackingToggle' as const, title: 'Advanced Tracking', sub: 'Enable detailed visitor analytics and pixel tracking.' }
                     ] as const).map((item) => (
                        <div key={item.id} className="flex items-center justify-between group">
                           <div className="space-y-1 pr-10">
                              <h3 className="text-[17px] font-black text-gray-900 group-hover:translate-x-1 transition-transform">{item.title}</h3>
                              {item.sub && <p className="text-[13px] font-bold text-gray-400 leading-relaxed max-w-md">{item.sub}</p>}
                           </div>
                           <div
                              onClick={() => patchFormData({ [item.id]: !Boolean(formData[item.id]) })}
                              className={`w-14 h-8 rounded-full transition-all relative cursor-pointer flex-shrink-0 ${formData[item.id] ? 'bg-black' : 'bg-gray-100'}`}
                           >
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData[item.id] ? 'left-7' : 'left-1'}`} />
                           </div>
                        </div>
                     ))}
                  </div>

                  {formData.trackingToggle && (
                     <div className="space-y-8 pt-6 pb-6 animate-in slide-in-from-top-4 duration-500 border-t border-gray-50 mt-4">
                        <div className="space-y-5">
                           <div className="space-y-1">
                              <h3 className="text-[14px] font-black text-gray-900">Meta Pixel</h3>
                              <p className="text-[12px] font-bold text-gray-400">Add your Meta Pixel IDs to get crucial visitor-level data.</p>
                           </div>
                           <input
                              className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[16px] text-[13px] font-bold outline-none focus:border-black transition-all shadow-sm"
                              placeholder="Enter Pixel ID"
                              value={formData.metaPixelId || ""}
                              onChange={e => patchFormData({ metaPixelId: e.target.value })}
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
                              onChange={e => patchFormData({ googleAnalyticsId: e.target.value })}
                           />
                        </div>
                     </div>
                  )}

                  <div className="space-y-8 pt-10 border-t border-gray-100">
                     <h3 className="text-[14px] font-black text-gray-400 uppercase tracking-widest">Post-Purchase</h3>
                     <div className="space-y-4">
                        <div className="p-6 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:border-black/20 transition-all space-y-4">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                                    <ExternalLink size={22} />
                                 </div>
                                 <div className="space-y-0.5">
                                    <p className="text-[16px] font-black text-gray-900">Custom Redirect</p>
                                    <p className="text-[12px] font-bold text-gray-400">Redirect buyers after successful payment</p>
                                 </div>
                              </div>
                              <div
                                 onClick={() => patchFormData({ customRedirectToggle: !formData.customRedirectToggle })}
                                 className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${formData.customRedirectToggle ? 'bg-black' : 'bg-gray-100'}`}
                              >
                                 <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.customRedirectToggle ? 'left-7' : 'left-1'}`} />
                              </div>
                           </div>
                           {formData.customRedirectToggle && (
                              <input
                                 className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-[16px] text-[13px] font-bold outline-none focus:border-black transition-all"
                                 placeholder="https://your-website.com/thank-you"
                                 value={formData.customRedirectUrl || ""}
                                 onChange={e => patchFormData({ customRedirectUrl: e.target.value })}
                              />
                           )}
                        </div>

                        <div className="p-6 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:border-black/20 transition-all space-y-4">
                           <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center">
                                 <Check size={22} />
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-[16px] font-black text-gray-900">Success Message</p>
                                 <p className="text-[12px] font-bold text-gray-400">Customize what buyers see after payment</p>
                              </div>
                           </div>
                           <div className="space-y-3">
                              <input
                                 className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-[16px] text-[13px] font-bold outline-none focus:border-black transition-all"
                                 placeholder="Success Title (e.g. Welcome to the Tribe!)"
                                 value={formData.successMessageTitle || ""}
                                 onChange={e => patchFormData({ successMessageTitle: e.target.value })}
                              />
                              <textarea
                                 className="w-full h-24 px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-[16px] text-[13px] font-bold outline-none focus:border-black transition-all resize-none"
                                 placeholder="Success Message (e.g. Your credentials have been sent...)"
                                 value={formData.successMessage || ""}
                                 onChange={e => patchFormData({ successMessage: e.target.value })}
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-8 pt-10 border-t border-gray-100">
                     <h3 className="text-[14px] font-black text-gray-400 uppercase tracking-widest">Customer Information</h3>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:border-black/20 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                 <Mail size={22} />
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-[16px] font-black text-gray-900">Email Verification</p>
                                 <p className="text-[12px] font-bold text-gray-400">Buyers must verify their email before buying</p>
                              </div>
                           </div>
                           <div
                              onClick={() => patchFormData({ emailVerification: !formData.emailVerification })}
                              className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${formData.emailVerification ? 'bg-black' : 'bg-gray-100'}`}
                           >
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.emailVerification ? 'left-7' : 'left-1'}`} />
                           </div>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:border-black/20 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                                 <Phone size={22} />
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-[16px] font-black text-gray-900">Phone Verification</p>
                                 <p className="text-[12px] font-bold text-gray-400">Required Verified OTP during checkout</p>
                              </div>
                           </div>
                           <div
                              onClick={() => patchFormData({ phoneVerification: !formData.phoneVerification })}
                              className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${formData.phoneVerification ? 'bg-black' : 'bg-gray-200'}`}
                           >
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.phoneVerification ? 'left-7' : 'left-1'}`} />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            ) : null}
         </main>

         {/* Bottom Actions */}
         <footer className="fixed bottom-0 left-0 right-0 z-40 flex h-24 items-center justify-end gap-3 border-t border-gray-50 bg-white/90 px-3 backdrop-blur-md sm:h-28 sm:gap-4 sm:px-6 lg:h-32 lg:px-20">
            <button
               onClick={onBack}
               className="rounded-full border border-gray-100 bg-white px-6 py-3 text-[13px] font-black text-black shadow-sm transition-all hover:bg-gray-50 active:scale-95 sm:px-10 sm:py-4 sm:text-[15px] lg:px-12 lg:py-5 lg:text-[16px]"
            >
               Back
            </button>
            <button
               disabled={isUploading}
               onClick={() => {
                  if (step === 3) {
                     handlePublish();
                     return;
                  }

                  onNext();
               }}
               className={`flex items-center gap-2 rounded-full px-6 py-3 text-[13px] font-black shadow-xl transition-all active:scale-95 sm:px-10 sm:py-4 sm:text-[15px] lg:px-12 lg:py-5 lg:text-[16px] ${isUploading ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-black text-white hover:bg-gray-900'}`}
            >
               {isUploading ? (
                  <>
                     <RefreshCw size={18} className="animate-spin" /> Uploading...
                  </>
               ) : (
                  step === 3 ? "Publish Collection" : "Continue"
               )}
            </button>
         </footer>
      </div>
   );
}

