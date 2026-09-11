import { Schema } from "effect";

export const SETTING_KEYS = [
	"foldToolCalls",
	"maxParallelSessions",
	"idleSiestaMinutes",
	"routineMailMinutes",
	"retireRestMinutes",
	"retireSweep",
	"holdEverything",
	"holdPieceDispatch",
	"holdWakes",
] as const;

export const SettingKey = Schema.Literals(SETTING_KEYS);
export type SettingKey = typeof SettingKey.Type;
