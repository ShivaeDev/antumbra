import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
import { unresolvedChangeIds } from "#outcome-status.ts";

// why: the rule reads three columns off a berth and two off the registry, so it
// names the shapes it reads rather than either table's whole row — the sweep's
// berth rows and the registry's repo rows both satisfy these by shape.
export interface BerthBranch {
	readonly branch: string;
	readonly id: string;
	readonly source: string;
}

export interface RepoSource {
	readonly id: string;
	readonly source: string;
}

// why: a berth names its repo by the source it was cut from and a change names
// it by the registry's id, so the registry — unique on source — is the only
// bridge between the two. A berth whose source is no longer registered is held
// by nothing: forgetting a repo hands its berths back to the ordinary sweep.
const backingChange = (
	berth: BerthBranch,
	unresolved: ReadonlyArray<ChangeRow>,
	repoOfSource: ReadonlyMap<string, string>,
): ChangeRow | undefined => {
	const repoId = repoOfSource.get(berth.source);
	return unresolved.find((change) => change.repoId === repoId && change.headRef === berth.branch);
};

// why: the reading joins four tables, so it takes them by name rather than by
// position — a caller that hands the dismissals where the links go would
// otherwise pin every berth on the fleet.
export interface BerthHolding {
	readonly berths: ReadonlyArray<BerthBranch>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly repos: ReadonlyArray<RepoSource>;
}

// why: the crew that must answer red checks or a review needs the worktree the
// change was written in, and its branch is right there with its reflog. Which
// changes still want an answer is the outcome model's word, never a stage this
// file names — so a change that died with nothing replacing it releases its
// berth here without this rule learning what death is. Each held berth carries
// the unresolved change holding it, so a sweep can say why.
export const heldBerths = (holding: BerthHolding): ReadonlyMap<string, string> => {
	const repoOfSource = new Map(holding.repos.map((repo) => [repo.source, repo.id] as const));
	const unresolvedIds = unresolvedChangeIds(holding);
	const unresolved = holding.changes.filter((change) => unresolvedIds.has(change.id));
	const held = new Map<string, string>();
	for (const berth of holding.berths) {
		const backing = backingChange(berth, unresolved, repoOfSource);
		if (backing !== undefined) {
			held.set(berth.id, backing.id);
		}
	}
	return held;
};
