import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { FLAG_KEYS, FLEET, type FlagDeclaration, FlagKey, type SwitchKey } from "#ids.ts";
import { flag } from "#rows/flag.ts";

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
	resumePieces: {
		description: "An idle agent with a ready piece is told to continue it.",
		fallback: true,
		title: "Resume a piece when its agent is idle",
	},
	retireSweep: {
		description: "Retire agents that have rested longer than the threshold.",
		fallback: true,
		title: "Retire rested agents",
	},
	sendToSiesta: {
		description: "An agent idle past the siesta window is put to sleep.",
		fallback: true,
		title: "Send idle agents to siesta",
	},
	signChanges: {
		description: "Adds one line at the end of every pull request body saying it was opened through Antumbra.",
		fallback: true,
		title: "Sign pull requests",
	},
	spawnForPiece: {
		description: "A launched piece with no living agent gets one.",
		fallback: true,
		title: "Spawn an agent for a launched piece",
	},
	spawnOnHail: {
		description: "A hail to a voyage with no living captain spawns one.",
		fallback: true,
		title: "Spawn a captain on a hail",
	},
	spawnSmoother: {
		description: "The daily smoother and the piece-conclusion smoother are spawned.",
		fallback: true,
		title: "Spawn a smoother",
	},
	wakeAfterRestart: {
		description: "A root cut mid-turn by a restart is told to resume at the next boot.",
		fallback: true,
		title: "Wake mid-turn roots after a restart",
	},
	wakeOnFlashMail: {
		description: "Flash mail wakes a resting agent at once.",
		fallback: true,
		title: "Wake on flash mail",
	},
	wakeOnHail: {
		description: "A hail from another agent wakes a resting captain.",
		fallback: true,
		title: "Wake the captain on a hail",
	},
	wakeOnPriorityMail: {
		description: "Priority mail wakes a resting agent at once.",
		fallback: true,
		title: "Wake on priority mail",
	},
	wakeOnRoutineMail: {
		description: "Routine mail wakes a resting agent after the quiet window.",
		fallback: true,
		title: "Wake on routine mail",
	},
};

export interface Switched {
	readonly key: FlagKey;
	readonly on: boolean;
}

const on = (flags: ReadonlyArray<Switched>, key: FlagKey): boolean => flags.find((held) => held.key === key)?.on ?? FLAGS[key].fallback;

export const allows = (flags: ReadonlyArray<Switched>, key: SwitchKey): boolean => !on(flags, "holdEverything") && on(flags, key);

export const FlagReading = Schema.Struct({ description: Schema.String, key: FlagKey, on: Schema.Boolean, title: Schema.String });

export const flags = query("flags", {
	input: {},
	output: Schema.Array(FlagReading),
	reads: [flag],
	scope: () => FLEET,
	run: Effect.fn("settings.flags")(function* (_input, rows) {
		const stored = yield* rows.flag.where({ scope: FLEET });
		return FLAG_KEYS.map((key) => ({
			description: FLAGS[key].description,
			key,
			on: stored.find((candidate) => candidate.key === key)?.on ?? FLAGS[key].fallback,
			title: FLAGS[key].title,
		}));
	}),
});
