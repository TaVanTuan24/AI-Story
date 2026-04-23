import { StoryController } from "@/server/api/controllers/story-controller";

const storyController = new StoryController();

export async function POST(request: Request) {
  return storyController.create(request);
}
