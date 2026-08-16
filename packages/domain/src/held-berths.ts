import type { ChangeRow } from "#change-rows.ts";
import { changeStatus } from "#outcome-status.ts";

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
	pending: ReadonlyArray<ChangeRow>,
	repoOfSource: ReadonlyMap<string, string>,
): ChangeRow | undefined => {
	const repoId = repoOfSource.get(berth.source);
	return pending.find(
		(change) => change.repoId === repoId && change.headRef === berth.branch,
	);
};

// why: the crew that must answer red checks or a review needs the worktree the
// change was written in, and its branch is right there with its reflog. Which
// changes still want an answer is the outcome model's word, never a stage this
// file names — the day a withdrawn change counts as pending again, so does the
// hold. Each held berth carries the change holding it, so a sweep can say why.
export const heldBerths = (
	berths: ReadonlyArray<BerthBranch>,
	changes: ReadonlyArray<ChangeRow>,
	repos: ReadonlyArray<RepoSource>,
): ReadonlyMap<string, string> => {
	const repoOfSource = new Map(
		repos.map((repo) => [repo.source, repo.id] as const),
	);
	const pending = changes.filter(
		(change) => changeStatus(change) === "pending",
	);
	const held = new Map<string, string>();
	for (const berth of berths) {
		const backing = backingChange(berth, pending, repoOfSource);
		if (backing !== undefined) {
			held.set(berth.id, backing.id);
		}
	}
	return held;
};
