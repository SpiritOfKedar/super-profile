import { NextRequest, NextResponse } from "next/server";
import { type Collection, type Filter, type OptionalUnlessRequiredId } from "mongodb";
import { badRequest, externalServiceError, internalServerError, notFound } from "@/lib/api-error";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { findUserById } from "@/lib/auth/user-store";
import { getMongoDb } from "@/lib/mongodb";
import { isMongoUnavailable } from "@/lib/mongo-errors";
import { type FormData, type Website } from "@/lib/types";

interface WebsitesPayload {
    formData: FormData;
    websiteEntry: Website;
}
interface DeleteWebsitePayload {
    slug?: string;
}

interface WebsiteDocument {
    slug: string;
    ownerId: string;
    ownerUsername: string;
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

async function getSession(req: NextRequest) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
        return null;
    }

    return verifySessionToken(token);
}

function unauthorizedResponse() {
    return NextResponse.json(
        {
            success: false,
            error: "Unauthorized",
            code: "UNAUTHORIZED",
        },
        { status: 401 }
    );
}

async function getWebsitesCollection(): Promise<Collection<WebsiteDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<WebsiteDocument>(WEBSITES_COLLECTION);

    if (!websiteIndexesReady) {
        websiteIndexesReady = (async () => {
            try {
                await collection.dropIndex("unique_slug");
            } catch {
                // ignore when index does not exist
            }
            await collection.createIndexes([
                {
                    key: { ownerId: 1, slug: 1 },
                    name: "unique_owner_slug",
                    unique: true,
                },
                {
                    key: { ownerUsername: 1, slug: 1 },
                    name: "owner_username_slug",
                    unique: true,
                },
                {
                    key: { "websiteEntry.title": 1 },
                    name: "website_title",
                },
                {
                    key: { ownerId: 1, updatedAt: -1 },
                    name: "owner_updated",
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
        const session = await getSession(req);
        if (!session) {
            return unauthorizedResponse();
        }

        const payload = (await req.json()) as WebsitesPayload;
        const slug = getSlug(payload?.websiteEntry?.slug);
        const user = await findUserById(session.sub);
        const ownerUsername = user?.username?.trim() || session.username?.trim();

        if (!slug || !ownerUsername) {
            return badRequest("Slug and username are required");
        }

        const collection = await getWebsitesCollection();
        const now = new Date().toISOString();
        const existing = await collection.findOne({ ownerId: session.sub, slug });

        const normalizedEntry = normalizeWebsiteEntry(payload.websiteEntry, slug);

        const document: OptionalUnlessRequiredId<WebsiteDocument> = {
            slug,
            ownerUsername,
            ownerId: existing?.ownerId || session.sub,
            formData: payload.formData,
            websiteEntry: normalizedEntry,
            createdAt: now,
            updatedAt: now,
        };

        await collection.updateOne(
            { ownerId: session.sub, slug },
            {
                $set: {
                    ownerUsername: document.ownerUsername,
                    ownerId: document.ownerId,
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

        console.log(`[websites] Published user=${ownerUsername} slug=${slug}`);

        return NextResponse.json({
            success: true,
            ownerUsername,
            slug,
            publicPath: `/u/${ownerUsername}/p/${slug}`,
        });
    } catch (error: unknown) {
        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }
        return internalServerError(error, "api/websites POST", "Failed to publish");
    }
}

export async function GET(req: NextRequest) {
    try {
        const collection = await getWebsitesCollection();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q")?.trim();
        const slug = getSlug(searchParams.get("slug"));
        const username = searchParams.get("username")?.trim().toLowerCase() || "";

        if (slug) {
            const website = username
                ? await collection.findOne({ ownerUsername: username, slug })
                : await collection.findOne({ slug });
            if (!website) {
                return notFound("Website not found");
            }
            return NextResponse.json(website.formData);
        }

        const session = await getSession(req);
        if (!session) {
            return unauthorizedResponse();
        }

        const filter: Filter<WebsiteDocument> = { ownerId: session.sub };

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
        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }
        return internalServerError(error, "api/websites GET", "Failed to fetch index");
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession(req);
        if (!session) {
            return unauthorizedResponse();
        }

        const payload = (await req.json()) as DeleteWebsitePayload;
        const slug = getSlug(payload?.slug);
        if (!slug) {
            return badRequest("Slug is required");
        }

        const collection = await getWebsitesCollection();
        const result = await collection.deleteOne({ ownerId: session.sub, slug });
        if (!result.deletedCount) {
            return notFound("Website not found");
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (isMongoUnavailable(error)) {
            return externalServiceError("Database temporarily unavailable. Please try again.");
        }
        return internalServerError(error, "api/websites DELETE", "Failed to delete website");
    }
}
