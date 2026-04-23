import mongoose from "mongoose";

import { env } from "@/lib/config/env";

declare global {
  var mongooseCache:
    | {
        connection: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cache = global.mongooseCache ?? {
  connection: null,
  promise: null,
};

global.mongooseCache = cache;

export async function connectToDatabase() {
  if (cache.connection && cache.connection.connection.readyState === 1) {
    return cache.connection;
  }

  if (cache.connection && cache.connection.connection.readyState === 0) {
    cache.connection = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: "ai-story",
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    cache.connection = null;
    throw error;
  }
}
