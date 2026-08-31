/**
 * Frame content mapping — fills the character-action frame with Inkstone's
 * existing content instead of forking the frame.
 *
 *   shell mode   ← Inkstone
 *   ----------------------------------------------------------
 *   training     ← Kata
 *   trials       ← Daily Scroll / Endless / Free Seed (leaderboard variants)
 *   missions     ← Pilgrimage (locked placeholder — zero available entries)
 *
 * move-list module ← the TECHNIQUES table
 * ranking          ← the rank seal / STYLE_RANKS
 * results          ← Finished Calligraphy
 */
import type { ModeDefinition } from "@slu/web-shell";
import type { MoveList } from "@slu/web-shell";
import type { SLUWebShell } from "@slu/web-shell";

import { TECHNIQUES, describeInputs } from "../techniques.js";
import type { StartRunRequest } from "./engine.js";

/** A move-list entry, as the shell's MoveList module wants it. */
interface ShellMove {
  id: string;
  label: string;
  input: string;
  description?: string;
  tags?: string[];
  unlockId?: string;
}

/** Inkstone technique as it exists on the TECHNIQUES table. */
interface InkstoneTechnique {
  id: string;
  name: string;
  group: string;
  attack: string | null;
  line: string;
  inputs: unknown[];
  unlocked?: boolean;
}

/**
 * Feed the shell MoveList the exact TECHNIQUES kit. Gate M6 (the ported FR4
 * audit) then checks that this list matches the sim kit.
 */
export function toShellMoves(): ShellMove[] {
  return (TECHNIQUES as InkstoneTechnique[]).map((t) => ({
    id: t.id,
    label: t.name,
    input: safeDescribeInputs(t),
    description: t.line,
    tags: [t.group],
    // Every technique ships unlocked today; the reserved unlock hook stays
    // wired so the move-list can hide locked forms once progression lands.
    unlockId: t.unlocked === false ? `technique:${t.id}` : undefined,
  }));
}

function safeDescribeInputs(t: InkstoneTechnique): string {
  try {
    return describeInputs(t) as string;
  } catch {
    // describeInputs resolves live key bindings; fall back to a plain join for
    // headless callers (the M6 audit runs in node without an Input singleton).
    return (t.inputs ?? [])
      .map((part) => (typeof part === "string" ? part : `[${(part as { action?: string }).action ?? "?"}]`))
      .join(" ");
  }
}

export function registerMoveList(moves: MoveList): void {
  moves.register(toShellMoves());
}

/**
 * The mode list shown in mode-select. The character-action assembly already
 * registers missions/training/trials; we register the concrete Inkstone
 * variants so the mode selection itself carries the scroll (the shell UI can't
 * type a Free Seed, so the entry surfaces the variant, not the seed).
 */
export const INKSTONE_MODES: ModeDefinition[] = [
  { id: "training", label: "KATA · TRAINING", description: "One oni, endlessly replaced. No waves, no death." },
  { id: "trials-daily", label: "DAILY SCROLL", description: "One seed for everyone, changing at UTC midnight.", leaderboardKey: "trial-rank" },
  { id: "trials-endless", label: "ENDLESS", description: "Same escalation, your own seed.", leaderboardKey: "trial-rank" },
  { id: "trials-freeseed", label: "FREE SEED", description: "Replay a fight exactly from a seed.", leaderboardKey: "trial-rank" },
  { id: "missions", label: "PILGRIMAGE", description: "The long road. Not yet walked." },
];

/** Mode ids that are locked placeholders (missions frame allows zero entries). */
export const LOCKED_MODES = new Set(["missions"]);

/** Map a selected shell mode id to an Inkstone run request. */
export function runRequestForMode(modeId: string, difficultyId: string): StartRunRequest | null {
  const difficulty = inkstoneDifficulty(difficultyId);
  switch (modeId) {
    case "training":
      return { mode: "kata", difficulty };
    case "trials-daily":
      return { mode: "daily", difficulty };
    case "trials-endless":
      return { mode: "free", scroll: "endless", scrollLabel: "ENDLESS", difficulty };
    case "trials-freeseed":
      return { mode: "free", scroll: "freeseed", scrollLabel: "FREE SEED", difficulty };
    default:
      return null; // missions / unknown → locked
  }
}

/**
 * The frame ships human/hunter/master with enemy dmg/health multipliers. The
 * Inkstone difficulty axis is still reserved (only `standard` is tuned), so all
 * three map to `standard` this pass; the frame ids stay visible and the
 * multiplier wiring is a documented follow-up rather than an untested change.
 */
export function inkstoneDifficulty(_shellDifficultyId: string): string {
  return "standard";
}

/** The frame's stat keys, mapped from an Inkstone run summary. */
export function statsFromSummary(summary: Record<string, unknown>): Record<string, number> {
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    // frame-native keys
    missionsCleared: num(summary.wavesCleared),
    damageTaken: num(summary.damageTaken),
    comboPeak: num(summary.bestCombo),
    playTimeMs: Math.round(num(summary.timeSeconds) * 1000),
    // extra keys added via the stats module rather than replacing the set
    strokes: num(summary.strokes),
    kills: num(summary.kills),
    parries: num(summary.parries),
    glyphs: num(summary.glyphsDrawn),
    uniqueForms: num(summary.uniqueForms),
    score: num(summary.score),
  };
}

/** highestRank is a grade string, tracked separately from the numeric stats. */
export function rankGradeFromSummary(summary: Record<string, unknown>): string | null {
  const rank = summary.rank as { grade?: string } | undefined;
  return rank?.grade ?? null;
}

/** Accumulate a finished run's stats into the shell StatsManager. */
export async function recordRunStats(
  shell: SLUWebShell<any>,
  summary: Record<string, unknown>
): Promise<void> {
  const stats = statsFromSummary(summary);
  await shell.stats.increment("missionsCleared", stats.missionsCleared ?? 0);
  await shell.stats.increment("damageTaken", stats.damageTaken ?? 0);
  await shell.stats.increment("playTimeMs", stats.playTimeMs ?? 0);
  const peak = Number(shell.stats.get<number>("comboPeak", 0));
  if ((stats.comboPeak ?? 0) > peak) await shell.stats.set("comboPeak", stats.comboPeak ?? 0);
  const grade = rankGradeFromSummary(summary);
  if (grade) {
    const best = shell.stats.get<string>("highestRank", "");
    if (rankOrder(grade) > rankOrder(best)) await shell.stats.set("highestRank", grade);
  }
}

const RANK_ORDER = ["", "D", "C", "B", "A", "S", "SS", "SSS"];
function rankOrder(grade: string): number {
  const i = RANK_ORDER.indexOf(grade);
  return i < 0 ? 0 : i;
}
