import { NextResponse } from "next/server";

import mongoose from "mongoose";

import { env, runtimeConfig } from "@/lib/config/env";
import { connectToDatabase } from "@/lib/db/mongoose";

let cachedHealth:
  | {
      expiresAt: number;
      payload: Record<string, unknown>;
    }
  | undefined;

export async function GET() {
  const now = Date.now();
  if (cachedHealth && cachedHealth.expiresAt > now) {
    return NextResponse.json(cachedHealth.payload);
  }

  let database = "disconnected";
  try {
    await connectToDatabase();
    database = mongoose.connection.readyState === 1 ? "connected" : "degraded";
  } catch {
    database = "unavailable";
  }

  const payload = {
    status: database === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: env.NODE_ENV,
    services: {
      database,
      aiProvider: env.AI_PROVIDER,
      aiProviderConfigured: runtimeConfig.aiProviderConfigured,
    },
  };

  cachedHealth = {
    expiresAt: now + 15_000,
    payload,
  };

  return NextResponse.json(payload, {
    status: payload.status === "ok" ? 200 : 503,
  });
}
