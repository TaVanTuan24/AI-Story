import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    storyId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  return NextResponse.json(
    {
      error: "The legacy /api/stories endpoint has been deprecated. Use /api/story-sessions instead.",
      code: "LEGACY_STORIES_API_DEPRECATED",
    },
    { status: 410 },
  );
}
