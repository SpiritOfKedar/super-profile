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
        // Fail faster in development when Atlas/network is unavailable.
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
    });
}

let mongoClientPromise: Promise<MongoClient> | null = null;

function createConnectPromise(): Promise<MongoClient> {
    return createMongoClient()
        .connect()
        .catch((error) => {
            // Reset cached promise so future requests can retry a new connection.
            mongoClientPromise = null;
            if (process.env.NODE_ENV === "development") {
                global.__mongoClientPromise = undefined;
            }
            throw error;
        });
}

function getMongoClientPromise(): Promise<MongoClient> {
    if (mongoClientPromise) {
        return mongoClientPromise;
    }

    if (process.env.NODE_ENV === "development") {
        mongoClientPromise = global.__mongoClientPromise ??= createConnectPromise();
        return mongoClientPromise;
    }

    mongoClientPromise = createConnectPromise();
    return mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
    const client = await getMongoClientPromise();
    return client.db(getMongoDbName());
}
