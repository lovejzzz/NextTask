/**
 * Tier 2 (BoardyV1) — a model that is actually his. The training-data pipeline.
 *
 * His weights can't be trained in a browser tab — but the *dataset* a fine-tune
 * consumes can be assembled entirely here, from data he already collects across his
 * life. That's the in-app half of Tier 2, and it's the substantive half: with the
 * dataset in hand, the offline run (LoRA / DPO / KTO on a GPU) is mechanical.
 *
 * Three real sources, each a standard format:
 *   - SFT (supervised) from his upbringing — the principle as system, the exemplar as
 *     the gold turn. This is how his character moves from a prompt into the weights.
 *   - SFT from his supervised knowledge — "what do you know about X" → the insight.
 *   - KTO (Kahneman-Tversky) from his Desk decisions — accepted proposals are desirable
 *     completions, dismissed ones undesirable. KTO fits the *unpaired* accept/reject
 *     signal he naturally collects (no need to pair chosen-vs-rejected on one prompt).
 *
 * Pure and deterministic; export is a thin wrapper. The offline trainer is the seam
 * the user provisions (a GPU), exactly as BoardyV1 describes.
 */
import type { Lesson } from './upbringing';
import type { Learning } from './knowledge';

export type ChatRole = 'system' | 'user' | 'assistant';
export type SftExample = { messages: { role: ChatRole; content: string }[] };
export type KtoExample = { prompt: string; completion: string; label: boolean };

/** A recorded Desk decision — the raw accept/reject signal that becomes KTO data. */
export type Decision = { context: string; completion: string; accepted: boolean; at: number };

/** SFT from his upbringing: the lesson's principle as system, the exemplar as the turn. */
export function upbringingToSft(lessons: Lesson[]): SftExample[] {
  return lessons
    .filter((l) => l.exemplar)
    .map((l) => ({
      messages: [
        { role: 'system', content: l.principle },
        { role: 'user', content: l.exemplar!.user },
        { role: 'assistant', content: l.exemplar!.assistant },
      ],
    }));
}

/** SFT from his supervised knowledge: a natural question to the insight he was taught. */
export function knowledgeToSft(learnings: Learning[]): SftExample[] {
  return learnings.map((l) => ({
    messages: [
      { role: 'user', content: `What do you know about ${l.topic}?` },
      { role: 'assistant', content: l.insight },
    ],
  }));
}

/** KTO from Desk decisions: accepted → desirable, dismissed → undesirable (unpaired). */
export function decisionsToKto(decisions: Decision[]): KtoExample[] {
  return decisions
    .filter((d) => d.completion.trim().length > 0)
    .map((d) => ({ prompt: d.context, completion: d.completion, label: d.accepted }));
}

/** Serialize rows to JSONL — one compact JSON object per line, the fine-tune wire format. */
export function toJSONL(rows: object[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n');
}

export type TrainingSet = { sft: SftExample[]; kto: KtoExample[]; summary: string };

/**
 * Assemble his whole training set from the sources he's accumulated. The summary is
 * honest about size — a model this personal is only as good as the life behind it, and
 * early on that life is short.
 */
export function buildTrainingSet({
  lessons,
  learnings,
  decisions,
}: {
  lessons: Lesson[];
  learnings: Learning[];
  decisions: Decision[];
}): TrainingSet {
  const sft = [...upbringingToSft(lessons), ...knowledgeToSft(learnings)];
  const kto = decisionsToKto(decisions);
  const positives = kto.filter((k) => k.label).length;
  const summary =
    `${sft.length} supervised example${sft.length === 1 ? '' : 's'} (upbringing + knowledge), ` +
    `${kto.length} preference example${kto.length === 1 ? '' : 's'} (${positives} kept, ${kto.length - positives} dismissed). ` +
    (sft.length + kto.length < 20
      ? 'Thin so far — this dataset grows as he lives; a personal model needs a life behind it.'
      : 'Enough to start a small LoRA/KTO run offline.');
  return { sft, kto, summary };
}

/** The two JSONL files a run consumes, keyed by suggested filename. */
export function exportFiles(set: TrainingSet): { name: string; content: string }[] {
  return [
    { name: 'boardy-sft.jsonl', content: toJSONL(set.sft) },
    { name: 'boardy-kto.jsonl', content: toJSONL(set.kto) },
  ];
}
