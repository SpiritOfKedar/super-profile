export type FlowType = "digital" | "list" | "existing";

export interface Website {
    title: string;
    price: string;
    sale: string;
    revenue: string;
    status: string;
    image?: string;
    lastModified?: string;
    type?: FlowType;
    slug?: string;
    ownerUsername?: string;
    publicPath?: string;
}

export interface Product {
    id: string;
    title: string;
    description: string;
    image?: string;
    price: string;
}

export interface FormData {
    title: string;
    category: string;
    cta: string;
    description: string;
    pricingType: string;
    price: string;
    discountPrice: string;
    pppEnabled: boolean;
    limitPurchases: boolean;
    themeId?: string;
    buttonColor: string;
    buttonTextColor: string;
    paymentPageFor: string;
    websiteLink: string;
    compulsoryBuy: boolean;

    // Optional Sections
    coverImage?: string;
    galleryTitle?: string;
    galleryImages?: string[];
    testimonialName?: string;
    testimonialComment?: string;
    testimonialImage?: string;
    faqs?: { question: string; answer: string }[];
    aboutUs?: string;

    // Multiple Products
    showProduct?: boolean;
    products?: Product[];
    productTitle?: string; // Kept for backward compatibility
    productImage?: string; // Kept for backward compatibility
    productDescription?: string; // Kept for backward compatibility

    // Footer
    footerText?: string;
    socialInstagram?: string;
    socialTwitter?: string;

    // Step 2 Fields
    digitalFilesLink?: string;
    digitalFilesImage?: string;

    // Step 3 - Advanced Settings
    customBgImage?: string;
    checkoutType?: string;
    emailVerification?: boolean;
    phoneVerification?: boolean;
    additionalQuestions?: { question: string; type: string; required: boolean }[];
    gstOnPrice?: string;
    termsAndConditions?: string;
    refundPolicy?: string;
    privacyPolicy?: string;
    customPageUrl?: string;
    postPurchaseBehaviour?: string;
    metaPixelId?: string;
    googleAnalyticsId?: string;

    // Step 3 - Additional Settings
    pageExpiry?: boolean;
    pageExpiryDate?: string;
    darkTheme?: boolean;
    deactivateSales?: boolean;
    trackingToggle?: boolean;
    brandColor?: string;

    // Post-Purchase
    customRedirectToggle?: boolean;
    customRedirectUrl?: string;
    successMessageTitle?: string;
    successMessage?: string;
}
