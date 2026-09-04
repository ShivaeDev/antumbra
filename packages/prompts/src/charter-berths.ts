import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { proseOf, section } from "#prose.ts";

const Berth = Schema.Struct({
	branch: Schema.String,
	folder: Schema.String,
	repo: Schema.String,
});

export const BerthedCharter = Schema.Struct({
	berths: Schema.Array(Berth),
	charter: Schema.String,
	moorageRoot: Schema.String,
	role: Schema.Literals(["captain", "crew"]),
});
export type BerthedCharter = typeof BerthedCharter.Type;

const CREW_ORDER = "- Make repository changes in the supplied Berth folders and branches.";

const CAPTAIN_ORDER = "- Use the repository names below when chartering work.";

const berthLine = (berth: typeof Berth.Type): string => `${berth.repo} — ${berth.folder} — branch ${berth.branch}`;

const berthsBody = (input: BerthedCharter): string =>
	[
		`Working directory: ${input.moorageRoot}. Keep notes and scratch files here; repository folders are listed below.`,
		...input.berths.map(berthLine),
	].join("\n");

export const berthedCharter = (input: BerthedCharter): AgentPrompt =>
	agentPrompt(
		input.berths.length === 0
			? input.charter
			: proseOf([[input.charter], [input.role === "captain" ? CAPTAIN_ORDER : CREW_ORDER, ""], section("Berths", berthsBody(input))]),
	);
