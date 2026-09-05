import { Schema } from "effect";
import { count, flag, type SettingDeclaration } from "#settings/declaration.ts";

export const SETTING_KEYS = [
	"foldToolCalls",
	"maxParallelSessions",
	"idleSiestaMinutes",
	"routineMailMinutes",
	"retireRestMinutes",
	"retireSweep",
] as const;

export const SettingKey = Schema.Literals(SETTING_KEYS);
export type SettingKey = typeof SettingKey.Type;

export const SETTINGS = {
	foldToolCalls: flag({
		description: "Fold a run of tool calls between messages into one line that says how many were made.",
		fallback: false,
		title: "Fold runs of tool calls",
	}),
	maxParallelSessions: count({
		description: "How many agents may be running at once.",
		fallback: 4,
		least: 1,
		most: 64,
		title: "Maximum running agents",
	}),
	idleSiestaMinutes: count({
		description: "Shorter waits free capacity sooner; longer waits are more likely to keep conversation context cached.",
		fallback: 60,
		least: 1,
		most: 1440,
		title: "Idle before siesta, in minutes",
	}),
	routineMailMinutes: count({
		description: "Routine mail waits this long before it wakes a resting agent; priority and flash mail wake one at once.",
		fallback: 5,
		least: 1,
		most: 1440,
		title: "Routine mail before a wake, in minutes",
	}),
	retireRestMinutes: count({
		description: "How long an agent must have rested before the sweep may retire it.",
		fallback: 15,
		least: 1,
		most: 1440,
		title: "Rest before retirement, in minutes",
	}),
	retireSweep: flag({
		description: "Retire agents that have rested longer than the threshold.",
		fallback: true,
		title: "Retire rested agents",
	}),
} as const satisfies Record<SettingKey, SettingDeclaration>;
