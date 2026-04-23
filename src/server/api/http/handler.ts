import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { createRequestContext, type RequestContext } from "@/server/api/http/request-context";
import { logger, serializeError } from "@/server/logging/logger";
import { checkRateLimit } from "@/server/middleware/rate-limit";
import { logRequest } from "@/server/middleware/request-logger";
import { sanitizeUnknownInput } from "@/server/security/sanitization";

type RouteCallback = (context: RequestContext) => Promise<NextResponse>;

export async function runRoute(
  request: Request,
  callback: RouteCallback,
  options?: {
    rateLimitKey?: string;
    rateLimitMaxRequests?: number;
    rateLimitWindowMs?: number;
  },
) {
  const context = createRequestContext(request);
  let response: NextResponse;

  try {
    checkRateLimit(`${options?.rateLimitKey ?? context.path}:${context.ip}`, {
      maxRequests: options?.rateLimitMaxRequests,
      windowMs: options?.rateLimitWindowMs,
    });
    response = await callback(context);
  } catch (error) {
    response = mapErrorToResponse(error, context.requestId);
    logger.error("http.error", {
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      ip: context.ip,
      userAgent: context.userAgent,
      error: serializeError(error),
    });
  }

  logRequest({
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    status: response.status,
    durationMs: Date.now() - context.startedAt,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  response.headers.set("x-request-id", context.requestId);
  return response;
}

export async function parseJson<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 0 && contentLength > env.REQUEST_BODY_MAX_BYTES) {
    throw new ApiError("Request body is too large.", 413, "REQUEST_TOO_LARGE");
  }

  const json = await request.json();
  return schema.parse(sanitizeUnknownInput(json));
}

export function mapErrorToResponse(error: unknown, requestId: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
        meta: { requestId },
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.expose ? error.message : "Request failed.",
        code: error.code,
        details: error.details,
        meta: { requestId },
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: "Internal server error.",
      code: "INTERNAL_ERROR",
      meta: { requestId },
    },
    { status: 500 },
  );
}
