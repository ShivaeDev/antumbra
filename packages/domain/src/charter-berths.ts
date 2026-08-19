import { section } from "#charter-sections.ts";

export interface CharterBerth {
	readonly branch: string;
	readonly folder: string;
	readonly repo: string;
}

export interface CharterMoorage {
	readonly berths: ReadonlyArray<CharterBerth>;
	readonly root: string;
}

// why: a berth folder is a lowered slug while the registry answers to the
// name it was given, so an agent that reads only the folder spells the repo
// wrong at the first change tool it reaches for.
export const CREW_BERTH_ORDER =
	"- Work inside a berth's folder, never in the moorage root itself and never in a mirror, and give `open_change`, `submit_change` and `adopt_change` the repo name exactly as the Berths section spells it — not the folder's name.";

export const CAPTAIN_BERTH_ORDER =
	"- The repos your crew is berthed in are the ones under Berths, spelled there as the registry knows them; a piece charter naming one spells it the same way.";

const berthLine = (berth: CharterBerth): string =>
	`${berth.repo} — ${berth.folder} — branch ${berth.branch}`;

// why: an absolute path on every line read as folders scattered elsewhere.
// The moorage is stated once as the place the agent already stands, and each
// berth is where it sits when the agent lists that directory. Scratch is
// placed in the same breath, because an agent that is told only about berths
// writes its own files beside the moorage instead of inside it.
const berthsBody = (moorage: CharterMoorage): string =>
	[
		`Your working directory is your moorage, ${moorage.root}. Every repository below is a folder directly inside it, and everything else you write — notes, scratch, files you mean to land — belongs in the moorage itself, never above it.`,
		...moorage.berths.map(berthLine),
	].join("\n");

// why: berths are provisioned inside the spawn, after the charter text was
// composed, so this is appended when the charter is delivered — the first
// moment the worktrees it names exist.
export const withBerths = (
	charter: string,
	moorage: CharterMoorage,
	standingOrder: string,
): string =>
	moorage.berths.length === 0
		? charter
		: [charter, standingOrder, "", ...section("Berths", berthsBody(moorage))]
				.join("\n")
				.trimEnd();
