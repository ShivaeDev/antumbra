import { section } from "#charter-sections.ts";

export interface CharterBerth {
	readonly branch: string;
	readonly path: string;
	readonly repo: string;
}

// why: the session opens in the moorage root, which holds the worktrees and is
// no repository itself, and a berth directory is a slug of the source rather
// than the name the registry answers to. An agent told neither has to list
// directories and guess which repo it is looking at.
export const CREW_BERTH_ORDER =
	"- Your session opens in the moorage root, which is no repository. Work inside a berth's worktree, never in that root and never in a mirror, and give `open_change`, `submit_change` and `adopt_change` the repo name exactly as the Berths section spells it — not the berth directory's name.";

export const CAPTAIN_BERTH_ORDER =
	"- Your session opens in the moorage root, which is no repository. The repos your crew is berthed in are the ones under Berths, spelled there as the registry knows them; a piece charter naming one spells it the same way.";

const berthLine = (berth: CharterBerth): string =>
	`${berth.repo} — worktree ${berth.path} — branch ${berth.branch}`;

// why: berths are provisioned inside the spawn, after the charter text was
// composed, so this is appended when the charter is delivered — the first
// moment the worktrees it names exist.
export const withBerths = (
	charter: string,
	berths: ReadonlyArray<CharterBerth>,
	standingOrder: string,
): string =>
	berths.length === 0
		? charter
		: [
				charter,
				standingOrder,
				"",
				...section("Berths", berths.map(berthLine).join("\n")),
			]
				.join("\n")
				.trimEnd();
