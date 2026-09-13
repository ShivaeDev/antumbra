import { type CountKey, type FlagKey, SWITCH_KEYS } from "@antumbra/domain-settings/ids.ts";

export interface Group {
	readonly description: string;
	readonly keys: readonly (CountKey | FlagKey)[];
	readonly title: string;
}

export const GROUPS: readonly Group[] = [
	{
		description: "What a transcript shows of a session's record.",
		keys: ["foldToolCalls"],
		title: "Transcript",
	},
	{
		description: "What Antumbra sends on its own.",
		keys: ["holdEverything", ...SWITCH_KEYS],
		title: "Wakes",
	},
	{
		description: "How many agents run at once, and when Antumbra rests, wakes, and retires them.",
		keys: ["maxParallelSessions", "idleSiestaMinutes", "retireSweep", "retireRestMinutes", "routineMailMinutes"],
		title: "Agents",
	},
	{
		description: "What goes into the pull requests Antumbra opens.",
		keys: ["signChanges"],
		title: "Pull requests",
	},
];
