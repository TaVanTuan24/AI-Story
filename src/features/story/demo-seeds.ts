import seeds from "@/features/story/demo-seeds.json";

export type DemoSeed = {
  id: string;
  label: string;
  genre: string;
  tone: string;
  enginePreset: string;
  difficulty: string;
  lengthPreference: string;
  titleHint: string;
  premise: string;
  seedPrompt: string;
};

export const demoSeeds = seeds satisfies DemoSeed[];
