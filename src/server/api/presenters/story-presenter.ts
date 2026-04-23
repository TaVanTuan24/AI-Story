type StoryDocument = {
  id?: string;
  _id?: string;
  title: string;
  genre: string;
  premise: string;
  tone: string;
  summary: string;
  worldRules: string[];
  memory: {
    shortTerm: Array<{
      turnNumber: number;
      actionText: string;
      sceneTitle: string;
      sceneSummary: string;
    }>;
    rollingSummaries: Array<{
      turnNumber: number;
      fromTurn: number;
      toTurn: number;
      content: string;
    }>;
    canon: {
      facts: Array<{
        id: string;
        category: string;
        subject: string;
        value: string;
        immutable: boolean;
      }>;
      irreversibleEvents: string[];
      importantFlags: string[];
      conflicts: Array<{
        factId: string;
        existingValue: string;
        proposedValue: string;
        detectedAtTurn: number;
        reason: string;
      }>;
    };
    entities: string[];
  };
  currentScene: {
    sceneNumber: number;
    title: string;
    body: string;
    rawActionInput?: string;
    choices: Array<{
      id: string;
      label: string;
      intent: string;
    }>;
  };
  scenes: StoryDocument["currentScene"][];
  metadata: {
    branchKey: string;
    turnCount: number;
    status: string;
    lastUpdatedAt: string;
  };
};

export function presentStory(story: StoryDocument) {
  return {
    id: story.id ?? story._id,
    title: story.title,
    genre: story.genre,
    premise: story.premise,
    tone: story.tone,
    summary: story.summary,
    worldRules: story.worldRules,
    memory: story.memory,
    currentScene: story.currentScene,
    scenes: story.scenes,
    metadata: story.metadata,
  };
}
