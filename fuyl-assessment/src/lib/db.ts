import "server-only";
import mongoose from "mongoose";
import { env } from "./env";

/**
 * Single shared Mongoose connection. Cached on globalThis so Next's dev-mode
 * hot reloads (and concurrent route handlers) don't open a new pool each time.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const g = globalThis as unknown as { __fuylMongoose?: Cache };
const cache: Cache = g.__fuylMongoose ?? (g.__fuylMongoose = { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI, MONGODB_DB } = env();
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: MONGODB_DB,
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      })
      .catch((err) => {
        cache.promise = null; // allow a retry on the next request
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
