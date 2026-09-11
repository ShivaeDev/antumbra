import { Schema } from "effect";

export const FLEET = "fleet";

export const FLAG_KEYS = ["foldToolCalls", "retireSweep", "holdEverything", "holdPieceDispatch", "holdWakes"] as const;

export const FlagKey = Schema.Literals(FLAG_KEYS);
export type FlagKey = typeof FlagKey.Type;

export const COUNT_KEYS = ["maxParallelSessions", "idleSiestaMinutes", "routineMailMinutes", "retireRestMinutes"] as const;

export const CountKey = Schema.Literals(COUNT_KEYS);
export type CountKey = typeof CountKey.Type;

export interface FlagDeclaration {
	readonly fallback: boolean;
	readonly title: string;
}

export interface CountDeclaration {
	readonly fallback: number;
	readonly max: number;
	readonly min: number;
	readonly title: string;
}

export const FLAGS: Readonly<Record<FlagKey, FlagDeclaration>> = {
	foldToolCalls: { fallback: false, title: "Fold runs of tool calls" },
	holdEverything: { fallback: false, title: "Hold everything" },
	holdPieceDispatch: { fallback: false, title: "Hold piece dispatch" },
	holdWakes: { fallback: false, title: "Hold wakes" },
	retireSweep: { fallback: true, title: "Retire rested agents" },
};

export const COUNTS: Readonly<Record<CountKey, CountDeclaration>> = {
	idleSiestaMinutes: { fallback: 60, max: 1440, min: 1, title: "Idle before siesta, in minutes" },
	maxParallelSessions: { fallback: 4, max: 64, min: 1, title: "Maximum running agents" },
	retireRestMinutes: { fallback: 15, max: 1440, min: 1, title: "Rest before retirement, in minutes" },
	routineMailMinutes: { fallback: 5, max: 1440, min: 1, title: "Routine mail before a wake, in minutes" },
};
