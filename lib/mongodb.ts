import "server-only";

import { MongoClient, ServerApiVersion, type Db } from "mongodb";

const DEFAULT_DB_NAME = "super_profile";

declare global {
    var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri(): string {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
        throw new Error("MONGODB_URI_MISSING");
    }

    return uri;
}

function getMongoDbName(): string {
    const dbName = process.env.MONGODB_DB_NAME?.trim();
    return dbName || DEFAULT_DB_NAME;
}

function createMongoClient(): MongoClient {
    return new MongoClient(getMongoUri(), {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });
}

let mongoClientPromise: Promise<MongoClient> | null = null;

function getMongoClientPromise(): Promise<MongoClient> {
    if (mongoClientPromise) {
        return mongoClientPromise;
    }

    if (process.env.NODE_ENV === "development") {
        mongoClientPromise = global.__mongoClientPromise ??= createMongoClient().connect();
        return mongoClientPromise;
    }

    mongoClientPromise = createMongoClient().connect();
    return mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
    const client = await getMongoClientPromise();
    return client.db(getMongoDbName());
}
