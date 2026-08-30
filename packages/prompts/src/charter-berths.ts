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
	// why: the charter was composed by this catalog and then written to the
	// spawn Intent, which outlives the process that wrote it. It comes back as
	// ordinary stored text, so this blank is where already-minted words re-enter
	// rather than a way for new prose to get in.
	charter: Schema.String,
	moorageRoot: Schema.String,
	role: Schema.Literals(["captain", "crew"]),
});
export type BerthedCharter = typeof BerthedCharter.Type;

// why: a berth folder is a lowered slug while the registry answers to the
// name it was given, so an agent that reads only the folder spells the repo
// wrong at the first change tool it reaches for.
const CREW_ORDER =
	"- Work inside a berth's folder, never in the moorage root itself and never in a mirror, and give `open_change`, `submit_change` and `adopt_change` the repo name exactly as the Berths section spells it — not the folder's name.";

const CAPTAIN_ORDER =
	"- The repos your crew is berthed in are the ones under Berths, spelled there as the registry knows them; a piece charter naming one spells it the same way.";

const berthLine = (berth: typeof Berth.Type): string => `${berth.repo} — ${berth.folder} — branch ${berth.branch}`;

// why: an absolute path on every line read as folders scattered elsewhere.
// The moorage is stated once as the place the agent already stands, and each
// berth is where it sits when the agent lists that directory. Scratch is
// placed in the same breath, because an agent that is told only about berths
// writes its own files beside the moorage instead of inside it.
const berthsBody = (input: BerthedCharter): string =>
	[
		`Your working directory is your moorage, ${input.moorageRoot}. Every repository below is a folder directly inside it, and everything else you write — notes, scratch, files you mean to land — belongs in the moorage itself, never above it.`,
		...input.berths.map(berthLine),
	].join("\n");

// why: berths are provisioned inside the spawn, after the charter text was
// composed, so this is appended when the charter is delivered — the first
// moment the worktrees it names exist.
export const berthedCharter = (input: BerthedCharter): AgentPrompt =>
	agentPrompt(
		input.berths.length === 0
			? input.charter
			: proseOf([[input.charter], [input.role === "captain" ? CAPTAIN_ORDER : CREW_ORDER, ""], section("Berths", berthsBody(input))]),
	);
