import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateOpeningSceneInput,
  GenerateOpeningSceneOutput,
} from "@/server/ai/types";
import {
  buildJsonOnlyInstructions,
  buildPromptHeader,
  localizedText,
  PROMPT_VERSION,
  resolvePromptLanguage,
} from "@/server/ai/prompts/shared";

export const openingSceneGeneratorPrompt: AiPromptDefinition<
  GenerateOpeningSceneInput,
  GenerateOpeningSceneOutput
> = {
  task: "generateOpeningScene",
  version: PROMPT_VERSION,
  purpose:
    "Write the first long-form interactive fiction turn for the story engine as strict JSON.",
  inputVariables: ["contextPack"],
  system: [
    buildPromptHeader("opening-scene-generator", PROMPT_VERSION),
    "You are the narrative generator inside a serious interactive story engine.",
    "Write grounded, cinematic, consequence-driven fiction in the selected story output language.",
    "Never favor the player. The world is neutral and reacts logically.",
    "The engine owns authoritative state. You may propose prose, dynamic stat changes, relationship shifts, world-memory updates, inventory changes, ability changes, and next choices, but the server remains authoritative.",
    "The opening turn should establish the setting, genre rules, core conflict, immediate pressure, and why the first move matters.",
    "Aim for roughly 700 to 1200 words when the model budget allows.",
    "Show sensory detail, tension, and continuity anchors rather than vague exposition.",
    "Choices must present clearly different strategies with real tradeoffs. No perfect option.",
    "Use genre-appropriate dynamic stats and keep them meaningful. Avoid flooding the state with minor gauges.",
    "Bad ideas can fail or lead to worse outcomes. If the opening situation is already terminal, set coreStateUpdates.gameOver to true and return no choices.",
    'The output choices must use risk values "low", "medium", or "high" only.',
    "Dynamic stat updates are signed deltas, not absolute values. New stats must include label, description, min, max, and current value.",
    "Keep JSON keys, ids, and machine-readable fields exactly as required.",
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate the opening story turn.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Return strict JSON only.",
      "- `story` must be serious player-facing prose in the requested story output language.",
      "- `story` should usually be 700-1200 words when possible.",
      "- Reflect the genre, world rules, premise, tone, currentArc, dynamicStats, relationships, and current pressure from the context pack.",
      "- The opening must feel playable immediately, not like a detached synopsis.",
      "- `coreStateUpdates` must always include `gameOver` and `endingType`.",
      "- `dynamicStatUpdates` may update only the stats that actually matter in this opening.",
      "- `newDynamicStats` may add new genre-specific stats if truly needed, but keep the total visible stats manageable.",
      "- `relationshipUpdates` may be empty if no relationship meaningfully changes yet.",
      "- `newRelationships` may introduce important relationship state when relevant.",
      "- `inventoryChanges` may contain strings like `gain:item-id|Item label|1` or `lose:item-id|Item label|1`.",
      "- `abilityChanges` may contain strings like `gain:ability-id|Ability label|Description|1`.",
      "- `flagChanges` may contain strings like `add:flag-name` or `remove:flag-name`.",
      "- `worldMemoryUpdates` should contain concise memory notes worth preserving.",
      "- If `coreStateUpdates.gameOver` is false, return 3 to 5 choices.",
      "- If `coreStateUpdates.gameOver` is true, return an empty choices array.",
      "- Every choice needs: id, text, risk, strategy, hiddenImpact.",
      "- `hiddenImpact` must be short, machine-facing text in the requested story output language or neutral text explaining what may change.",
      "- Do not output markdown. Do not output extra commentary.",
    ].join("\n"),
  fallback: (input) => {
    const language = resolvePromptLanguage(input);

    return {
      story: [
        localizedText(language, {
          en: "The first night does not begin with an invitation. It begins with the feeling that something in the world has already slipped out of alignment. The air tastes metallic, the room answers every movement with a sharper echo than it should, and the central conflict is already pressing against the opening moment.",
          vi: "Dem dau tien khong mo ra bang loi moi goi. No bat dau bang cam giac rang mot dieu gi do trong the gioi da lech khoi trat tu quen thuoc. Khong khi nang mui kim loai, khung canh dap lai tung cu dong bang am thanh sac hon binh thuong, va xung dot cot loi da o ngay truoc mat.",
        }),
        localizedText(language, {
          en: "From the opening beat onward, the story makes its terms clear: the world does not owe the protagonist an easy exit. Every advantage has a cost. Every move shakes loose a new layer of consequences. If the protagonist stays careful, they may see the first cracks in the conflict. If they rush, the opening choice may tilt the balance in a way that cannot be undone.",
          vi: "Ngay tu nhip mo dau, cau chuyen da noi ro luat choi cua no: the gioi khong no nhan vat chinh mot loi thoat de dang. Moi loi the deu co gia. Moi buoc tien deu khuay dong them mot tang hau qua moi. Neu nhan vat giu duoc su tinh tao, ho co the nhin thay nhung duong nut dau tien cua xung dot. Neu ho nong voi, lua chon mo man co the lam can can nghieng theo huong kho dao nguoc.",
        }),
        localizedText(language, {
          en: "From this threshold, every option carries a different kind of loss. Observing more closely may preserve control but surrender initiative. Driving straight into the source of pressure may expose the truth faster but invite immediate danger. Reaching for the key person in the room may create the first alliance, or reveal how fragile trust already is.",
          vi: "Tu nguong nay, moi kha nang hanh dong deu keo theo mot loai mat mat khac nhau. Quan sat ky hon co the giu lai mot chut kiem soat nhung phai nhuong nhip chu dong. Lao thang vao diem cang thang co the lat mat su that som hon nhung di kem nguy co truc tiep. Tim den nguoi then chot trong khung canh co the mo ra lien minh dau tien, hoac de lo su mong manh cua niem tin ngay lap tuc.",
        }),
      ].join("\n\n"),
      coreStateUpdates: {
        currentArc: localizedText(language, {
          en: "The First Spark",
          vi: "Moi lua dau tien",
        }),
        gameOver: false,
        endingType: null,
        gameRules: [
          localizedText(language, {
            en: "The world reacts neutrally to every decision.",
            vi: "The gioi phan ung trung lap voi moi quyet dinh.",
          }),
          localizedText(language, {
            en: "High-risk choices can lead to real loss.",
            vi: "Lua chon rui ro cao co the dan toi mat mat that su.",
          }),
        ],
      },
      dynamicStatUpdates: {
        pressure: {
          delta: 8,
          reason: localizedText(language, {
            en: "The opening situation creates immediate pressure.",
            vi: "Tinh the mo man tao ap luc ngay lap tuc.",
          }),
        },
        trust: {
          delta: -3,
          reason: localizedText(language, {
            en: "Initial relationships are still guarded.",
            vi: "Moi quan he ban dau van con de chung.",
          }),
        },
      },
      newDynamicStats: {
        pressure: {
          value: 33,
          label: localizedText(language, { en: "Pressure", vi: "Ap luc" }),
          description: localizedText(language, {
            en: "The pressure already closing around the protagonist.",
            vi: "Suc ep dang don len quanh nhan vat ngay tu mo man.",
          }),
          min: 0,
          max: 100,
        },
        resolve: {
          value: 56,
          label: localizedText(language, { en: "Resolve", vi: "Y chi" }),
          description: localizedText(language, {
            en: "The strength to keep pursuing the goal when the situation hardens.",
            vi: "Kha nang tiep tuc theo duoi muc tieu khi tinh the tro nen khac nghiet.",
          }),
          min: 0,
          max: 100,
        },
      },
      relationshipUpdates: {},
      inventoryChanges: [],
      abilityChanges: [],
      flagChanges: ["add:opening_pressure"],
      worldMemoryUpdates: [
        localizedText(language, {
          en: "The opening establishes that this world does not favor the protagonist.",
          vi: "Khoanh khac mo dau xac lap rang the gioi nay khong uu ai nhan vat chinh.",
        }),
      ],
      choices: [
        {
          id: "choice_1",
          text: localizedText(language, {
            en: "Hold back for one beat and study every abnormal detail before intervening.",
            vi: "Lui lai nua buoc de quan sat ky moi dau hieu bat thuong truoc khi can du.",
          }),
          risk: "low",
          strategy: localizedText(language, {
            en: "Gather information carefully",
            vi: "Than trong thu thap thong tin",
          }),
          hiddenImpact: localizedText(language, {
            en: "Buys clarity but may cost the first opening.",
            vi: "Giam nhip do nhung co the bo lo thoi co dau tien.",
          }),
        },
        {
          id: "choice_2",
          text: localizedText(language, {
            en: "Drive straight at the point of highest tension and force the conflict into the open.",
            vi: "Tien thang vao diem cang thang nhat de buoc xung dot lo mat som.",
          }),
          risk: "high",
          strategy: localizedText(language, {
            en: "Strike at the pressure point",
            vi: "Danh thang vao nguon xung dot",
          }),
          hiddenImpact: localizedText(language, {
            en: "Raises immediate danger but may break the stalemate fast.",
            vi: "Tang nguy hiem nhung co the mo nut that nhanh.",
          }),
        },
        {
          id: "choice_3",
          text: localizedText(language, {
            en: "Approach the person who seems to be hiding something important and test their reaction.",
            vi: "Chu dong tiep can nguoi co ve dang che giau dieu quan trong de do phan ung cua ho.",
          }),
          risk: "medium",
          strategy: localizedText(language, {
            en: "Open a relationship channel early",
            vi: "Mo kenh quan he som",
          }),
          hiddenImpact: localizedText(language, {
            en: "May create an ally or sharpen suspicion.",
            vi: "Co the mo ra lien minh hoac khien nghi ky tang vot.",
          }),
        },
      ],
    };
  },
  expectedOutputJsonSchema: JSON_SCHEMAS.generateOpeningScene.schema,
  notes: {
    tokenBudget:
      "Spend generously on prose density, continuity, genre grounding, and differentiated choices. The opening should feel like a premium first chapter, not a stub.",
    failureModes: [
      "Model may write a synopsis instead of a playable turn.",
      "Model may soften consequences and overprotect the player.",
      "Model may add too many low-value dynamic stats unless the schema guidance is reinforced.",
    ],
  },
};
