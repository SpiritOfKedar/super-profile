import "server-only";

import { randomUUID } from "crypto";
import { type Collection } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export interface StoredUser {
    id: string;
    name: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
}

export interface PublicUser {
    id: string;
    name: string;
    username: string;
    email: string;
    createdAt: string;
}

interface StoredUserDocument {
    id: string;
    name: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
    _id?: unknown;
}

const USERS_COLLECTION_NAME = "users";
let usersIndexesReady: Promise<void> | null = null;

async function getUsersCollection(): Promise<Collection<StoredUserDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<StoredUserDocument>(USERS_COLLECTION_NAME);

    if (!usersIndexesReady) {
        usersIndexesReady = (async () => {
            await collection.updateMany(
                {
                    $or: [
                        { username: { $exists: false } },
                        { username: "" },
                    ],
                },
                [
                    {
                        $set: {
                            username: {
                                $concat: ["user_", { $substrCP: ["$id", 0, 8] }],
                            },
                        },
                    },
                ]
            );
            await collection.createIndexes([
                {
                    key: { email: 1 },
                    name: "unique_email",
                    unique: true,
                },
                {
                    key: { username: 1 },
                    name: "unique_username",
                    unique: true,
                },
                {
                    key: { id: 1 },
                    name: "unique_id",
                    unique: true,
                },
            ]);
        })().catch((error) => {
            usersIndexesReady = null;
            throw error;
        });
    }

    await usersIndexesReady;
    return collection;
}

function toStoredUser(document: StoredUserDocument | null): StoredUser | undefined {
    if (!document) {
        return undefined;
    }

    if (
        typeof document.id !== "string"
        || typeof document.name !== "string"
        || typeof document.email !== "string"
        || typeof document.passwordHash !== "string"
        || typeof document.createdAt !== "string"
    ) {
        return undefined;
    }

    return {
        id: document.id,
        name: document.name,
        username: typeof document.username === "string" && document.username.trim()
            ? normalizeUsername(document.username)
            : normalizeUsername(document.email.split("@")[0] || `user_${document.id.slice(0, 8)}`),
        email: document.email,
        passwordHash: document.passwordHash,
        createdAt: document.createdAt,
    };
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
}

export function toPublicUser(user: StoredUser): PublicUser {
    return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
    };
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
    const normalized = normalizeEmail(email);
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ email: normalized });
    return toStoredUser(user);
}

export async function createUserRecord(input: {
    name: string;
    username: string;
    email: string;
    passwordHash: string;
}): Promise<StoredUser> {
    const usersCollection = await getUsersCollection();
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedUsername = normalizeUsername(input.username);

    const newUser: StoredUser = {
        id: randomUUID(),
        name: input.name.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash: input.passwordHash,
        createdAt: new Date().toISOString(),
    };

    try {
        await usersCollection.insertOne(newUser);
    } catch (error: unknown) {
        const maybeError = error as { code?: number; keyPattern?: Record<string, unknown> };
        if (maybeError.code === 11000) {
            if (maybeError.keyPattern?.username) {
                throw new Error("USERNAME_EXISTS");
            }
            throw new Error("USER_EXISTS");
        }

        throw error;
    }

    return newUser;
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ id: id.trim() });
    return toStoredUser(user);
}

export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ username: normalizeUsername(username) });
    return toStoredUser(user);
}

export async function updateUserPasswordHash(userId: string, passwordHash: string): Promise<boolean> {
    const usersCollection = await getUsersCollection();
    const result = await usersCollection.updateOne(
        { id: userId.trim() },
        { $set: { passwordHash } }
    );
    return result.matchedCount > 0;
}

export async function deleteUserById(userId: string): Promise<boolean> {
    const usersCollection = await getUsersCollection();
    const result = await usersCollection.deleteOne({ id: userId.trim() });
    return result.deletedCount > 0;
}
