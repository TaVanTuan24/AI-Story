import { ApiError } from "@/server/api/errors/api-error";
import { ok } from "@/server/api/http/response";
import { parseJson } from "@/server/api/http/handler";
import { analytics } from "@/server/analytics/analytics-service";
import {
  presentStorySessionDetail,
  presentStorySessionListItem,
  presentStoryTurnResponse,
} from "@/server/api/presenters/story-session-presenter";
import { requireAuth } from "@/server/middleware/auth";
import { withGenerationPermit } from "@/server/security/generation-guard";
import { moderateCustomInput } from "@/server/security/moderation";
import { StorySessionService } from "@/server/services/story-session-service";
import {
  createStorySessionSchema,
  storySessionActionSchema,
  storySessionCustomActionSchema,
} from "@/server/validation/api-schemas";

export class StorySessionController {
  constructor(private readonly storySessionService = new StorySessionService()) {}

  async create(request: Request, requestId: string) {
    const auth = await requireAuth(request);
    const payload = await parseJson(request, createStorySessionSchema);
    const session = await this.storySessionService.createSession(auth.userId, payload);
    return ok(requestId, presentStorySessionListItem(session), 201);
  }

  async list(request: Request, requestId: string) {
    const auth = await requireAuth(request);
    const sessions = await this.storySessionService.listSessions(auth.userId);
    return ok(requestId, sessions.map(presentStorySessionListItem));
  }

  async getById(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const detail = await this.storySessionService.presentOwnedSessionDetail(
      auth.userId,
      sessionId,
    );
    return ok(requestId, detail);
  }

  async start(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const started = await withGenerationPermit(`start:${auth.userId}`, async () => {
      try {
        return await this.storySessionService.startSession(auth.userId, sessionId);
      } catch (error) {
        if (error instanceof ApiError) {
          await trackCompletionFailure(auth.userId, sessionId, "start", error.code);
          throw error;
        }
        await trackCompletionFailure(auth.userId, sessionId, "start", "GENERATION_UNAVAILABLE");
        throw new ApiError(
          "Story generation is temporarily unavailable. Please retry shortly.",
          503,
          "GENERATION_UNAVAILABLE",
        );
      }
    });
    return ok(
      requestId,
      presentStorySessionDetail({
        session: started.session,
        world: started.world,
        storyState: started.storyState,
        characters: started.characters,
      }),
    );
  }

  async turn(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const payload = await parseJson(request, storySessionActionSchema);
    const result = await withGenerationPermit(`turn:${auth.userId}:${sessionId}`, async () => {
      try {
        return await this.storySessionService.submitChoiceTurn(auth.userId, sessionId, payload);
      } catch (error) {
        if (error instanceof ApiError) {
          await trackCompletionFailure(auth.userId, sessionId, "choice", error.code);
          throw error;
        }
        await trackCompletionFailure(auth.userId, sessionId, "choice", "TURN_GENERATION_UNAVAILABLE");
        throw new ApiError(
          "The next scene could not be generated right now. Please retry the turn.",
          503,
          "TURN_GENERATION_UNAVAILABLE",
        );
      }
    });
    return ok(
      requestId,
      presentStoryTurnResponse({
        session: presentStorySessionDetail({
          session: result.details.session,
          world: result.details.world,
          storyState: result.details.storyState,
          characters: result.details.characters,
        }),
        processedTurn: result.processed,
      }),
    );
  }

  async customAction(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const payload = await parseJson(request, storySessionCustomActionSchema);
    const moderated = moderateCustomInput(
      payload.customInput,
      `custom-input:${auth.userId}:${sessionId}`,
    );
    const result = await withGenerationPermit(
      `custom:${auth.userId}:${sessionId}`,
      async () => {
        try {
          return await this.storySessionService.submitCustomAction(auth.userId, sessionId, {
            customInput: moderated.safeText,
          });
        } catch (error) {
          if (error instanceof ApiError) {
            await trackCompletionFailure(auth.userId, sessionId, "custom", error.code);
            throw error;
          }
          await trackCompletionFailure(auth.userId, sessionId, "custom", "CUSTOM_ACTION_UNAVAILABLE");
          throw new ApiError(
            "The custom action could not be processed right now. Please retry with a shorter or clearer action.",
            503,
            "CUSTOM_ACTION_UNAVAILABLE",
          );
        }
      },
    );
    return ok(
      requestId,
      presentStoryTurnResponse({
        session: presentStorySessionDetail({
          session: result.details.session,
          world: result.details.world,
          storyState: result.details.storyState,
          characters: result.details.characters,
        }),
        processedTurn: result.processed,
      }),
    );
  }

  async save(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const session = await this.storySessionService.saveSession(auth.userId, sessionId);
    return ok(requestId, presentStorySessionListItem(session));
  }

  async resume(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const detail = await this.storySessionService.resumeSession(auth.userId, sessionId);
    return ok(
      requestId,
      presentStorySessionDetail({
        session: detail.session,
        world: detail.world,
        storyState: detail.storyState,
        characters: detail.characters,
      }),
    );
  }

  async history(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const history = await this.storySessionService.getHistory(auth.userId, sessionId);
    return ok(requestId, history);
  }

  async recap(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    const recap = await withGenerationPermit(`recap:${auth.userId}:${sessionId}`, async () => {
      try {
        return await this.storySessionService.getRecap(auth.userId, sessionId);
      } catch (error) {
        if (error instanceof ApiError) {
          await trackCompletionFailure(auth.userId, sessionId, "recap", error.code);
          throw error;
        }
        await trackCompletionFailure(auth.userId, sessionId, "recap", "RECAP_UNAVAILABLE");
        throw new ApiError(
          "Recap generation is temporarily unavailable. Please try again in a moment.",
          503,
          "RECAP_UNAVAILABLE",
        );
      }
    });
    return ok(requestId, recap);
  }

  async delete(request: Request, requestId: string, sessionId: string) {
    const auth = await requireAuth(request);
    await this.storySessionService.deleteSession(auth.userId, sessionId);
    return ok(requestId, { deleted: true });
  }
}

async function trackCompletionFailure(
  userId: string,
  storySessionId: string,
  stage: string,
  errorCode: string,
) {
  await analytics.track({
    eventType: "completion_failed",
    userId,
    storySessionId,
    properties: {
      stage,
      errorCode,
    },
  });
}
