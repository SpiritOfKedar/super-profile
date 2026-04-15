import { extractApiErrorMessage } from "@/lib/error-utils";
import { FormData, Website } from "@/lib/types";
import { getWebsitesList, saveWebsiteBySlug, saveWebsitesList } from "@/lib/builder/storage";

function createWebsiteSlug(formData: FormData, fallback: string) {
    return formData.customPageUrl || formData.title?.toLowerCase().replace(/[^a-z0-9]/g, "-") || fallback;
}

interface PersistPublishResult {
    slug: string;
    websiteEntry: Website;
}

export function persistDigitalPublish(formData: FormData): PersistPublishResult {
    const slug = createWebsiteSlug(formData, "my-website");
    saveWebsiteBySlug(slug, formData);

    const websiteEntry: Website = {
        title: formData.title || "Untitled Website",
        price: `₹${formData.price || "0"}`,
        sale: "0",
        revenue: "₹0",
        status: "Active",
        image: formData.coverImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426",
        lastModified: "Just now",
        slug,
        type: "digital"
    };

    const existingList = getWebsitesList();
    const updatedList = [websiteEntry, ...existingList.filter((site) => site.slug !== slug)];
    saveWebsitesList(updatedList);

    return { slug, websiteEntry };
}

export function persistListPublish(formData: FormData): PersistPublishResult {
    const slug = createWebsiteSlug(formData, "my-collection");
    saveWebsiteBySlug(slug, formData);

    const websiteEntry: Website = {
        title: formData.title || "Untitled Collection",
        price: `₹${formData.price || "0"}`,
        sale: "0",
        revenue: "₹0",
        status: "Active",
        image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=2371",
        lastModified: "Just now",
        slug,
        type: "list"
    };

    const existingList = getWebsitesList();
    const updatedList = [websiteEntry, ...existingList.filter((site) => site.slug !== slug)];
    saveWebsitesList(updatedList);

    return { slug, websiteEntry };
}

export interface SyncIndexResult {
    synced: boolean;
    errorMessage?: string;
}

export async function syncPublishedWebsiteIndex(formData: FormData, websiteEntry: Website): Promise<SyncIndexResult> {
    try {
        const response = await fetch("/api/websites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ formData, websiteEntry })
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => null);
            return {
                synced: false,
                errorMessage: extractApiErrorMessage(errorPayload, "Failed to sync website index."),
            };
        }

        return { synced: true };
    } catch (error: unknown) {
        return {
            synced: false,
            errorMessage: error instanceof Error ? error.message : "Failed to sync website index.",
        };
    }
}
