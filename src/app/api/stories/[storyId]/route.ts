import { StoryController } from "@/server/api/controllers/story-controller";

const storyController = new StoryController();

type RouteContext = {
  params: Promise<{
    storyId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { storyId } = await context.params;
  return storyController.getById(storyId);
}
