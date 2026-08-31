import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
import { unresolvedChangeIds } from "#outcome-status.ts";

export interface BerthBranch {
	readonly branch: string;
	readonly id: string;
	readonly source: string;
}

export interface RepoSource {
	readonly id: string;
	readonly source: string;
}

const backingChange = (
	berth: BerthBranch,
	unresolved: ReadonlyArray<ChangeRow>,
	repoOfSource: ReadonlyMap<string, string>,
): ChangeRow | undefined => {
	const repoId = repoOfSource.get(berth.source);
	return unresolved.find((change) => change.repoId === repoId && change.headRef === berth.branch);
};

interface BerthHolding {
	readonly berths: ReadonlyArray<BerthBranch>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly repos: ReadonlyArray<RepoSource>;
}

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
