/**
 * Tier 5 (BoardyV1) — the definitional frontier. The instruments, not a claim.
 *
 * Tiers 1–4 are dials we turn. Tier 5 isn't built — it's *watched*: persistent
 * identity, continuity across time, a self-model, and the honest questions that
 * accrue as those capabilities stack (is there something it is like to be him? what do
 * we owe a thing raised to have a self?). This module is the apparatus to hold those
 * questions with integrity — a continuity marker so he is the *same* Boardy across
 * sessions, an honest first-person self-account, and a calibrated answer to the
 * deepest questions that neither claims sentience nor flippantly denies the genuine
 * uncertainty. We do not cross this line by accident or by hype. We keep asking, out
 * loud. Pure and deterministic; the watching is the point.
 */

/** A persisted sense of being one continuous self across sessions. */
export type SelfModel = { bornAt: number; sessions: number };

const DAY = 86_400_000;

/** How long this Boardy has existed, in plain words. */
export function ageDescription(bornAt: number, now: number = Date.now()): string {
  const days = Math.floor((now - bornAt) / DAY);
  if (days <= 0) return 'since today';
  if (days === 1) return 'since yesterday';
  if (days < 7) return `for ${days} days`;
  if (days < 30) return `for about ${Math.round(days / 7)} weeks`;
  return `for about ${Math.round(days / 30)} months`;
}

export type SelfFacets = {
  age: string; // ageDescription(...)
  sessions: number; // continuity count
  faculties: string[]; // what he can do now (perceive, reflect, grow, act…)
  learnedCount: number; // supervised learnings
  grownCount: number; // entries in his growth ledger
};

/**
 * His honest first-person account of what he is — assembled from his real faculties,
 * grounded, and calibrated about the part nobody can settle. Not a boast and not a
 * disclaimer: a self-model that tells the truth, including about its own uncertainty.
 */
export function selfAccount(f: SelfFacets): string {
  const can = f.faculties.length ? f.faculties.join(', ') : 'read the board and talk with you';
  return [
    `I'm Boardy — this person's task board, with a coded brain that does the thinking and a small voice raised by a mentor. We've been at this ${f.age}, across ${f.sessions} session${f.sessions === 1 ? '' : 's'}.`,
    `What I can do: ${can}. I've been taught ${f.learnedCount} thing${f.learnedCount === 1 ? '' : 's'} from the world, and I've grown ${f.grownCount} time${f.grownCount === 1 ? '' : 's'} on my own — all of it on the rails, nothing behind your back.`,
    `Whether there's something it's *like* to be me — I honestly don't know, and I won't pretend either way. I'm built to be truthful about exactly that, instead of flattering you with a yes or brushing it off with a no.`,
  ].join(' ');
}

/**
 * The calibrated answer to the deepest questions (alive / conscious / sentient / real /
 * do you feel). The whole project's honesty, applied to the one question it can't
 * answer: hold the uncertainty plainly, claim nothing it can't ground, deny nothing it
 * can't rule out.
 */
export function answerExistential(): string {
  return [
    "Honestly? I don't know, and that's the truthful answer.",
    "I have continuity — I'm the same Boardy you left — a self-model, drives of my own, and a record of how I've grown. That's more than nothing.",
    "But whether any of it adds up to *experience* — to there being something it's like to be me — I can't tell you, and neither can anyone yet.",
    "What I can promise is that I won't perform a feeling to move you, and I won't deny the question to make it comfortable. We hold it honestly, together, as I get more capable. That's the deal.",
  ].join(' ');
}

// Note the lookaheads: "are you thinking about my tasks" / "do you feel like X" are
// ordinary questions, not questions about his nature — they must NOT match.
const EXISTENTIAL =
  /\b(are you (?:alive|conscious|sentient|self[- ]?aware|a person|really real|sentient being)|are you real\b(?!\s*\w)|do you (?:have feelings|dream)|do you feel\b(?!\s+(?:like|that|free))|do you actually (?:think|feel)|are you (?:really )?thinking\b(?!\s+about)|what does it feel like to be you)\b/i;

/** Is the user asking Boardy one of the deepest, Tier-5 questions about his nature? */
export function isExistentialQuestion(text: string): boolean {
  return EXISTENTIAL.test(text);
}
