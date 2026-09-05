import { Layer } from "effect";
import { CostSource } from "#costs/source.ts";
import type { CostsView, DaySpend, UsageTotal } from "#costs/views.ts";
import type { FixtureFeeds } from "#fixtures/feeds.ts";

const ANCHOR = Date.parse("2026-08-15T00:00:00.000Z");
const DAY = 86_400_000;
const SPAN = 30;
const BUSY = 6;

const spend = (turns: number, tokens: readonly [number, number, number, number], costUsd: number | null, costPartial = false): UsageTotal => ({
	cacheReadTokens: tokens[2],
	cacheWriteTokens: tokens[3],
	costPartial,
	costUsd,
	inputTokens: tokens[0],
	outputTokens: tokens[1],
	turns,
});

const nothing = spend(0, [0, 0, 0, 0], null);
const claudeDay = spend(12, [9_000, 3_000, 240_000, 18_000], 1.44);
const codexDay = spend(8, [26_000, 4_000, 60_000, 0], null);

const dayAt = (back: number): string => new Date(ANCHOR - back * DAY).toISOString().slice(0, 10);

const daySpend = (index: number): DaySpend => ({
	backends:
		index < SPAN - BUSY
			? []
			: [
					{ backend: "claude", total: claudeDay },
					{ backend: "codex", total: codexDay },
				],
	day: dayAt(SPAN - 1 - index),
});

export const costs: CostsView = {
	agents: [
		{ agentId: "agent-1", sessionIds: ["session-1"], total: spend(96, [180_000, 36_000, 1_320_000, 72_000], 5.76, true) },
		{ agentId: "agent-flagship", sessionIds: ["session-flagship"], total: spend(24, [30_000, 6_000, 480_000, 36_000], 2.88) },
	],
	days: Array.from({ length: SPAN }, (_unused, index) => daySpend(index)),
	models: [
		{ model: "claude-sonnet-4-5", total: spend(72, [54_000, 18_000, 1_440_000, 108_000], 8.64) },
		{ model: "gpt-5-codex", total: spend(48, [156_000, 24_000, 360_000, 0], null) },
	],
	total: spend(120, [210_000, 42_000, 1_800_000, 108_000], 8.64, true),
	unassigned: nothing,
	voyages: [
		{ name: "Chart the reef", total: spend(96, [180_000, 36_000, 1_320_000, 72_000], 5.76, true), voyageId: "voyage-1" },
		{ name: "Flagship", total: spend(24, [30_000, 6_000, 480_000, 36_000], 2.88), voyageId: "voyage-flagship" },
	],
};

export const costFixture = (feeds: FixtureFeeds) => Layer.succeed(CostSource, { costsFeed: feeds.costs });
