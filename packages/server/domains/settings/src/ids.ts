import { Schema } from "effect";

export const FLEET = "fleet";

export const SWITCH_KEYS = [
	"resumePieces",
	"wakeOnFlashMail",
	"wakeOnPriorityMail",
	"wakeOnRoutineMail",
	"wakeAfterRestart",
	"wakeOnHail",
	"spawnForPiece",
	"spawnOnHail",
	"spawnSmoother",
	"sendToSiesta",
] as const;

export const SwitchKey = Schema.Literals(SWITCH_KEYS);
export type SwitchKey = typeof SwitchKey.Type;

export const FLAG_KEYS = ["foldToolCalls", "signChanges", "retireSweep", "holdEverything", ...SWITCH_KEYS] as const;

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
	readonly unit: string | null;
}
