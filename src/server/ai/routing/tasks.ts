import type { AiTaskName, AiTaskRoutingMap } from "@/server/ai/types";
import type { UserAITask } from "@/server/persistence/types/data-models";

export const AI_TASK_ROUTE_MAP: AiTaskRoutingMap = {
  generateWorld: "world_generation",
  generateCharacters: "character_generation",
  generateOpeningScene: "opening_scene",
  generateChoices: "choice_generation",
  interpretCustomAction: "custom_action_interpretation",
  generateNextScene: "next_scene",
  summarizeTurns: "summarization",
  checkConsistency: "consistency_check",
  generateSessionTitle: "session_title",
  generateRecap: "recap",
};

export function toUserAITask(task: AiTaskName): UserAITask {
  return AI_TASK_ROUTE_MAP[task];
}
