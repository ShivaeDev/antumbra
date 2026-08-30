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

const CREW_ORDER =
	"- Work inside a berth's folder, never in the moorage root itself and never in a mirror, and give `open_change`, `submit_change` and `adopt_change` the repo name exactly as the Berths section spells it — not the folder's name.";

const CAPTAIN_ORDER =
	"- The repos your crew is berthed in are the ones under Berths, spelled there as the registry knows them; a piece charter naming one spells it the same way.";

const berthLine = (berth: typeof Berth.Type): string => `${berth.repo} — ${berth.folder} — branch ${berth.branch}`;

const berthsBody = (input: BerthedCharter): string =>
	[
		`Your working directory is your moorage, ${input.moorageRoot}. Every repository below is a folder directly inside it, and everything else you write — notes, scratch, files you mean to land — belongs in the moorage itself, never above it.`,
		...input.berths.map(berthLine),
	].join("\n");

export const berthedCharter = (input: BerthedCharter): AgentPrompt =>
	agentPrompt(
		input.berths.length === 0
			? input.charter
			: proseOf([[input.charter], [input.role === "captain" ? CAPTAIN_ORDER : CREW_ORDER, ""], section("Berths", berthsBody(input))]),
	);
