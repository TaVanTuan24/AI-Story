import { StoryController } from "@/server/api/controllers/story-controller";

const storyController = new StoryController();

type RouteContext = {
  params: Promise<{
    storyId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { storyId } = await context.params;
  return storyController.continue(request, storyId);
}
