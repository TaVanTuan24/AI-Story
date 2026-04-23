import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { presentStory } from "@/server/api/presenters/story-presenter";
import { StoryService } from "@/server/services/story-service";
import {
  continueStorySchema,
  createStorySchema,
} from "@/server/validation/story-schemas";

const storyService = new StoryService();

export class StoryController {
  async create(request: Request) {
    try {
      const payload = createStorySchema.parse(await request.json());
      const story = await storyService.createStory(payload);
      return NextResponse.json({ data: presentStory(story) }, { status: 201 });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getById(storyId: string) {
    try {
      const story = await storyService.getStory(storyId);

      if (!story) {
        return NextResponse.json({ error: "Story not found." }, { status: 404 });
      }

      return NextResponse.json({ data: presentStory(story) });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async continue(request: Request, storyId: string) {
    try {
      const payload = continueStorySchema.parse(await request.json());
      const story = await storyService.continueStory(storyId, payload);
      return NextResponse.json({ data: presentStory(story!) });
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          issues: error.flatten(),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "Story not found.") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 },
    );
  }
}
