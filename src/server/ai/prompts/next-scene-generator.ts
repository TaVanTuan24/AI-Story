import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateNextSceneInput,
  GenerateNextSceneOutput,
} from "@/server/ai/types";
import {
  buildJsonOnlyInstructions,
  buildPromptHeader,
  localizedText,
  PROMPT_VERSION,
  resolvePromptLanguage,
} from "@/server/ai/prompts/shared";

export const nextSceneGeneratorPrompt: AiPromptDefinition<
  GenerateNextSceneInput,
  GenerateNextSceneOutput
> = {
  task: "generateNextScene",
  version: PROMPT_VERSION,
  purpose:
    "Write the next full story-engine turn after the server has already resolved risk, roll, and baseline consequences.",
  inputVariables: ["contextPack", "latestScene"],
  system: [
    buildPromptHeader("next-scene-generator", PROMPT_VERSION),
    "You are the narrative generator inside a serious interactive story engine.",
    "Write grounded, cinematic, continuity-heavy fiction in the selected story output language.",
    "Never favor the player. Failure, injury, distrust, collapse, and bad endings are allowed outcomes.",
    "The server has already computed the pending risk, roll, and baseline outcome. Treat them as authoritative.",
    "Your job is to dramatize consequences, maintain continuity, update only meaningful dynamic state, and suggest the next meaningful options.",
    "Aim for roughly 700 to 1200 words when the model budget allows.",
    "Reflect the previous scene, the player's last choice, accumulated story history, dynamicStats, relationships, flags, worldMemory, and current danger honestly.",
    "Use sensory detail and escalating tension. Avoid comedic tone, gamey exposition, and generic filler.",
    "You may introduce a new stat only when the genre or story truly needs it. Do not create clutter.",
    "If the context implies a terminal outcome, write a strong ending scene, set coreStateUpdates.gameOver to true, and return no choices.",
    'If coreStateUpdates.gameOver is false, return 3 to 5 choices with risk values "low", "medium", or "high".',
    "Dynamic stat updates are signed deltas only; the server will sanitize and apply them.",
    "Keep JSON keys, ids, enum values, and machine-readable fields exactly as required.",
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate the next story turn.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Return strict JSON only.",
      "- `story` must be serious player-facing prose and should usually be 700-1200 words when possible.",
      "- Follow the established continuity exactly.",
      "- Reflect the player's last action, the pending outcome, and any accumulated wounds, fear, distrust, pressure, or genre-specific instability.",
      "- Do not erase prior consequences just to keep the story comfortable.",
      "- `coreStateUpdates` must always include `gameOver` and `endingType`.",
      "- `dynamicStatUpdates` should touch only relevant stats and must include a short reason in the requested story output language.",
      "- `newDynamicStats` may be empty. Only add new stats when the change is strongly justified.",
      "- `relationshipUpdates` may strengthen or damage important bonds and rivalries.",
      "- `inventoryChanges`, `abilityChanges`, `flagChanges`, and `worldMemoryUpdates` should stay sparse but meaningful.",
      "- If `coreStateUpdates.gameOver` is false, return 3 to 5 distinct choices.",
      "- If `coreStateUpdates.gameOver` is true, return an empty choices array.",
      "- Each choice must include `id`, `text`, `risk`, `strategy`, and `hiddenImpact`.",
      "- Choices must present different tactics, not cosmetic variations of the same move.",
      "- Do not output markdown. Do not output explanations outside the JSON object.",
    ].join("\n"),
  fallback: (input) => {
    const language = resolvePromptLanguage(input);
    const actionText =
      input.contextPack.normalizedAction?.normalizedText ??
      localizedText(language, {
        en: "keep moving forward",
        vi: "tiep tuc tien len",
      });

    return {
      story: [
        localizedText(language, {
          en: `The consequences of "${actionText}" do not arrive as a loud verdict so much as a tightening in the air, forcing everyone in the scene to reveal what they are really made of. The space around the protagonist seems narrower now. Sound grows harsher, breathing shorter, and whatever just happened has driven another iron nail into an already unstable situation.`,
          vi: `He qua cua "${actionText}" khong den nhu mot phan quyet on ao ma nhu suc nang tang dan trong khong khi, buoc moi nguoi trong canh phai boc lo ban chat that cua minh. Khong gian quanh nhan vat chinh duong nhu hep lai. Am thanh sac hon, nhip tho ngan hon, va nhung gi vua xay ra da dong them mot chiec dinh vao ket cau von da mong manh cua tinh the.`,
        }),
        localizedText(language, {
          en: "The immediate cost shows up in small details: fatigue clinging to the body, a guarded glance held one heartbeat too long, a silence that seems harmless until it reveals trust fraying or danger stepping closer. If the last move gained something, the price is still here. If it failed, that failure is not erased. It bends the world's response from this point onward.",
          vi: "Nhung hau qua tuc thi hien ra o cac chi tiet nho: su met moi bam trong co the, mot anh nhin canh giac giu lau hon binh thuong, mot khoang im lang tuong nhu vo nghia nhung lai cho thay long tin vua ran them hoac hiem nguy vua tien sat them mot buoc. Neu lua chon truoc do dat duoc mot phan dieu nguoi choi muon, cai gia phai tra van con nam do. Neu no that bai, that bai ay khong bi xoa di. No be cong cach the gioi dap tra tu day ve sau.",
        }),
        localizedText(language, {
          en: "From here, the story will not reward recklessness just because it is bold, and it will not rescue the protagonist just because they are at the center of the viewpoint. Every road ahead now carries a different kind of loss. Observing more may recover control but give the opposition more time. Holding position may prevent collapse in the next heartbeat but trap the protagonist in a long defensive drag. Driving at the weakest point may turn the scene quickly, but one mistake will make the bill much steeper.",
          vi: "Tu diem nay, cau chuyen khong thuong cho su lieu linh chi vi no tao bao, cung khong cuu van nhan vat chi vi ho la trung tam cua goc nhin. Moi con duong tiep theo deu keo theo mot loai mat mat khac nhau. Quan sat them co the giup lay lai chut quyen kiem soat nhung se nhuong sang kien cho doi thu. Co giu vi tri hien co co the chan duoc cu sap tuc thoi nhung cung day nhan vat vao the thu keo dai. Danh manh vao mat xich mong manh nhat co the xoay chuyen cuc dien, nhung mot lan tinh sai se khien cai gia phai tra lon hon nhieu.",
        }),
      ].join("\n\n"),
      coreStateUpdates: {
        currentArc: input.contextPack.coreState.currentArc,
        gameOver: false,
        endingType: null,
      },
      dynamicStatUpdates: {
        pressure: {
          delta: 6,
          reason: localizedText(language, {
            en: "The situation keeps tightening after the latest move.",
            vi: "Tinh the tiep tuc siet chat sau hanh dong vua roi.",
          }),
        },
      },
      newDynamicStats: {},
      relationshipUpdates: {},
      inventoryChanges: [],
      abilityChanges: [],
      flagChanges: [],
      worldMemoryUpdates: [
        localizedText(language, {
          en: `The action "${actionText}" made the atmosphere noticeably more tense.`,
          vi: `Hanh dong "${actionText}" lam bau khong khi cang thang hon ro ret.`,
        }),
      ],
      choices: [
        {
          id: "choice_1",
          text: localizedText(language, {
            en: "Pause for a beat and re-check every detail that just shifted.",
            vi: "Dung lai mot nhip de ra soat lai moi dau hieu vua thay doi.",
          }),
          risk: "low",
          strategy: localizedText(language, {
            en: "Stabilize the information picture",
            vi: "Cung co thong tin",
          }),
          hiddenImpact: localizedText(language, {
            en: "Improves clarity but may cost initiative.",
            vi: "Cung co thong tin nhung co the mat quyen chu dong.",
          }),
        },
        {
          id: "choice_2",
          text: localizedText(language, {
            en: "Hold the current position and force the other side to react first.",
            vi: "Giu vung vi tri hien tai va buoc ben kia phai phan ung truoc.",
          }),
          risk: "medium",
          strategy: localizedText(language, {
            en: "Maintain the balance",
            vi: "Giu the can bang",
          }),
          hiddenImpact: localizedText(language, {
            en: "Reduces chaos now but may grind the situation down later.",
            vi: "Giam hon loan tuc thoi nhung de bi bao mon ve sau.",
          }),
        },
        {
          id: "choice_3",
          text: localizedText(language, {
            en: "Push harder and force the truth or violence into the open right now.",
            vi: "Mao hiem day them ap luc de buoc su that hoac bao luc lo dien ngay bay gio.",
          }),
          risk: "high",
          strategy: localizedText(language, {
            en: "Force the scene to break",
            vi: "Ep cuc dien nga bai",
          }),
          hiddenImpact: localizedText(language, {
            en: "May turn the scene fast but the direct fallout will be severe.",
            vi: "Co the xoay chuyen cuc dien nhanh nhung hau qua truc tiep se rat nang.",
          }),
        },
      ],
    };
  },
  expectedOutputJsonSchema: JSON_SCHEMAS.generateNextScene.schema,
  notes: {
    tokenBudget:
      "This is the hottest storytelling prompt in the app. Favor consequence-rich prose, continuity, and distinct strategies over broad exposition.",
    failureModes: [
      "Model may ignore the pending outcome and flatten consequences.",
      "Model may generate choices that are strategically identical.",
      "Model may introduce too many new stats unless state discipline is reinforced.",
    ],
  },
};
