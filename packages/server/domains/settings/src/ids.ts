import { Schema } from "effect";

export const FLEET = "fleet";

export const FLAG_KEYS = ["foldToolCalls", "signChanges", "retireSweep", "holdEverything", "holdPieceDispatch", "holdWakes"] as const;

export const FlagKey = Schema.Literals(FLAG_KEYS);
export type FlagKey = typeof FlagKey.Type;

export const COUNT_KEYS = ["maxParallelSessions", "idleSiestaMinutes", "routineMailMinutes", "retireRestMinutes"] as const;

export const CountKey = Schema.Literals(COUNT_KEYS);
export type CountKey = typeof CountKey.Type;

export interface FlagDeclaration {
	readonly description: string;
	readonly fallback: boolean;
	readonly title: string;
}

export interface CountDeclaration {
	readonly description: string;
	readonly fallback: number;
	readonly max: number;
	readonly min: number;
	readonly title: string;
}

export const FLAGS: Readonly<Record<FlagKey, FlagDeclaration>> = {
	foldToolCalls: {
		description: "Fold a run of tool calls between messages into one line that says how many were made.",
		fallback: false,
		title: "Fold runs of tool calls",
	},
	holdEverything: {
		description: "Nothing Antumbra sends on its own goes out. Every queue keeps filling and running sessions carry on.",
		fallback: false,
		title: "Hold everything",
	},
	holdPieceDispatch: {
		description: "Launched pieces wait in the queue instead of having an agent spawned on them.",
		fallback: false,
		title: "Hold piece dispatch",
	},
	holdWakes: {
		description: "Agents at rest are not woken by their own mail; the mail stays unread and due.",
		fallback: false,
		title: "Hold wakes",
	},
	retireSweep: {
		description: "Retire agents that have rested longer than the threshold.",
		fallback: true,
		title: "Retire rested agents",
	},
	signChanges: {
		description: "Adds one line at the end of every pull request body that Antumbra opens.",
		fallback: true,
		title: "Sign pull requests as opened through Antumbra",
	},
};

export const COUNTS: Readonly<Record<CountKey, CountDeclaration>> = {
	idleSiestaMinutes: {
		description: "Shorter waits free capacity sooner; longer waits are more likely to keep conversation context cached.",
		fallback: 60,
		max: 1440,
		min: 1,
		title: "Idle before siesta, in minutes",
	},
	maxParallelSessions: {
		description: "How many agents may be running at once.",
		fallback: 4,
		max: 64,
		min: 1,
		title: "Maximum running agents",
	},
	retireRestMinutes: {
		description: "How long an agent must have rested before the sweep may retire it.",
		fallback: 15,
		max: 1440,
		min: 1,
		title: "Rest before retirement, in minutes",
	},
	routineMailMinutes: {
		description: "Routine mail waits this long before it wakes a resting agent; priority and flash mail wake one at once.",
		fallback: 5,
		max: 1440,
		min: 1,
		title: "Routine mail before a wake, in minutes",
	},
};
