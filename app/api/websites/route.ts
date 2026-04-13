import { NextRequest, NextResponse } from "next/server";
import { type Collection, type Filter, type OptionalUnlessRequiredId } from "mongodb";
import { badRequest, internalServerError, notFound } from "@/lib/api-error";
import { getMongoDb } from "@/lib/mongodb";
import { type FormData, type Website } from "@/lib/types";

interface WebsitesPayload {
    formData: FormData;
    websiteEntry: Website;
}

interface WebsiteDocument {
    slug: string;
    formData: FormData;
    websiteEntry: Website;
    createdAt: string;
    updatedAt: string;
    _id?: unknown;
}

const WEBSITES_COLLECTION = "websites";
let websiteIndexesReady: Promise<void> | null = null;

function getSlug(rawSlug: unknown): string {
    return typeof rawSlug === "string" ? rawSlug.trim() : "";
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getWebsitesCollection(): Promise<Collection<WebsiteDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<WebsiteDocument>(WEBSITES_COLLECTION);

    if (!websiteIndexesReady) {
        websiteIndexesReady = (async () => {
            await collection.createIndexes([
                {
                    key: { slug: 1 },
                    name: "unique_slug",
                    unique: true,
                },
                {
                    key: { "websiteEntry.title": 1 },
                    name: "website_title",
                },
            ]);
        })().catch((error) => {
            websiteIndexesReady = null;
            throw error;
        });
    }

    await websiteIndexesReady;
    return collection;
}

function normalizeWebsiteEntry(entry: Website, slug: string): Website {
    return {
        ...entry,
        slug,
    };
}

export async function POST(req: NextRequest) {
    try {
        const payload = (await req.json()) as WebsitesPayload;
        const slug = getSlug(payload?.websiteEntry?.slug);

        if (!slug) {
            return badRequest("Slug is required");
        }

        const collection = await getWebsitesCollection();
        const now = new Date().toISOString();
        const normalizedEntry = normalizeWebsiteEntry(payload.websiteEntry, slug);

        const document: OptionalUnlessRequiredId<WebsiteDocument> = {
            slug,
            formData: payload.formData,
            websiteEntry: normalizedEntry,
            createdAt: now,
            updatedAt: now,
        };

        await collection.updateOne(
            { slug },
            {
                $set: {
                    formData: document.formData,
                    websiteEntry: document.websiteEntry,
                    updatedAt: now,
                },
                $setOnInsert: {
                    slug: document.slug,
                    createdAt: now,
                },
            },
            { upsert: true }
        );

        console.log(`DEBUG: Website ${slug} published and indexed.`);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return internalServerError(error, "api/websites POST", "Failed to publish");
    }
}

export async function GET(req: NextRequest) {
    try {
        const collection = await getWebsitesCollection();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q")?.trim();
        const slug = getSlug(searchParams.get("slug"));

        if (slug) {
            const website = await collection.findOne({ slug });
            if (!website) {
                return notFound("Website not found");
            }
            return NextResponse.json(website.formData);
        }

        const filter: Filter<WebsiteDocument> = {};

        if (query) {
            const escapedQuery = escapeRegex(query);
            filter.$or = [
                { slug: { $regex: escapedQuery, $options: "i" } },
                { "websiteEntry.title": { $regex: escapedQuery, $options: "i" } },
            ];
        }

        const websites = await collection
            .find(filter)
            .sort({ updatedAt: -1 })
            .project<{ websiteEntry: Website }>({ websiteEntry: 1, _id: 0 })
            .toArray();

        return NextResponse.json(websites.map((item) => item.websiteEntry));
    } catch (error: unknown) {
        return internalServerError(error, "api/websites GET", "Failed to fetch index");
    }
}
