import type { ChangeStage } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { type BerthBranch, heldBerths, type RepoSource } from "#held-berths.ts";
import { changeOf } from "#test/change-fixtures.ts";

const REEF: RepoSource = { id: "repo-reef", source: "/somewhere/reef" };
const SHOAL: RepoSource = { id: "repo-shoal", source: "/somewhere/shoal" };
const BRANCH = "work/keeper/berth-0";

const REGISTRY: ReadonlyArray<RepoSource> = [REEF, SHOAL];

const berth = (id: string, branch: string, repo: RepoSource): BerthBranch => ({
	branch,
	id,
	source: repo.source,
});

const REEF_BERTH = berth("keeper:reef", BRANCH, REEF);

const onReef = (stage: ChangeStage) =>
	changeOf({ headRef: BRANCH, id: "change-1", repoId: REEF.id, stage });

const linked = [{ changeId: "change-1", pieceId: "piece-1" }];

it("a berth whose branch backs a pending change is held by that change", () => {
	expect(heldBerths([REEF_BERTH], [onReef("open")], REGISTRY, linked)).toEqual(
		new Map([["keeper:reef", "change-1"]]),
	);
});

// why: which changes still want an answer is the outcome model's word, so a
// stage this rule has never heard of holds the berth rather than freeing it.
it("a prepared change holds the berth and a landed one lets it go", () => {
	expect(
		heldBerths([REEF_BERTH], [onReef("prepared")], REGISTRY, linked).size,
	).toBe(1);
	expect(
		heldBerths([REEF_BERTH], [onReef("landed")], REGISTRY, linked).size,
	).toBe(0);
});

it("a withdrawn change holds until a linked replacement lands", () => {
	const withdrawn = onReef("withdrawn");
	const replacement = changeOf({
		headRef: "work/keeper/replacement",
		id: "change-2",
		repoId: REEF.id,
		stage: "landed",
	});
	expect(heldBerths([REEF_BERTH], [withdrawn], REGISTRY, linked).size).toBe(1);
	expect(
		heldBerths([REEF_BERTH], [withdrawn, replacement], REGISTRY, [
			...linked,
			{ changeId: replacement.id, pieceId: "piece-1" },
		]).size,
	).toBe(0);
});

it("a berth on another branch of the same repo is not held", () => {
	const sibling = berth("keeper:sibling", "work/keeper/berth-1", REEF);
	expect(heldBerths([sibling], [onReef("open")], REGISTRY, linked).size).toBe(
		0,
	);
});

it("a berth on the same branch name in another repo is not held", () => {
	const elsewhere = berth("keeper:shoal", BRANCH, SHOAL);
	expect(heldBerths([elsewhere], [onReef("open")], REGISTRY, linked).size).toBe(
		0,
	);
});

// why: forgetting a repo hands its berths back to the ordinary sweep — there is
// no source left to join a change to, and reclaim still answers to the runner.
it("a berth cut from a source no longer registered is not held", () => {
	expect(heldBerths([REEF_BERTH], [onReef("open")], [SHOAL], linked).size).toBe(
		0,
	);
});

it("the berth holding no change at all is simply absent", () => {
	expect(heldBerths([REEF_BERTH], [], REGISTRY, []).size).toBe(0);
});
