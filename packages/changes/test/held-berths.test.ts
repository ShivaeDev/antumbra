import type { ChangeStage } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
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

const onReef = (stage: ChangeStage) => changeOf({ headRef: BRANCH, id: "change-1", repoId: REEF.id, stage });

const linked = [{ changeId: "change-1", pieceId: "piece-1", purpose: "produces" as const }];

const holding = (
	berths: ReadonlyArray<BerthBranch>,
	changes: ReadonlyArray<ChangeRow>,
	repos: ReadonlyArray<RepoSource>,
	pieceChanges: ReadonlyArray<PieceChangeRow>,
	dismissedChangeIds: ReadonlySet<string> = new Set(),
) => heldBerths({ berths, changes, dismissedChangeIds, pieceChanges, repos });

it("a berth whose branch backs a pending change is held by that change", () => {
	expect(holding([REEF_BERTH], [onReef("open")], REGISTRY, linked)).toEqual(new Map([["keeper:reef", "change-1"]]));
});

it("a prepared change holds the berth and a landed one lets it go", () => {
	expect(holding([REEF_BERTH], [onReef("prepared")], REGISTRY, linked).size).toBe(1);
	expect(holding([REEF_BERTH], [onReef("landed")], REGISTRY, linked).size).toBe(0);
});

it("a withdrawn change with nothing replacing it releases the berth", () => {
	expect(holding([REEF_BERTH], [onReef("withdrawn")], REGISTRY, linked).size).toBe(0);
});

it("a withdrawn change holds only while a replacement is being prepared", () => {
	const withdrawn = onReef("withdrawn");
	const replacement = (stage: ChangeStage) =>
		changeOf({
			headRef: "work/keeper/replacement",
			id: "change-2",
			repoId: REEF.id,
			stage,
		});
	const alsoLinked = [...linked, { changeId: "change-2", pieceId: "piece-1", purpose: "produces" as const }];
	expect(holding([REEF_BERTH], [withdrawn, replacement("prepared")], REGISTRY, alsoLinked).size).toBe(1);
	expect(holding([REEF_BERTH], [withdrawn, replacement("landed")], REGISTRY, alsoLinked).size).toBe(0);
});

it("a dismissed change releases the berth even mid-replacement", () => {
	const withdrawn = onReef("withdrawn");
	const replacement = changeOf({
		headRef: "work/keeper/replacement",
		id: "change-2",
		repoId: REEF.id,
		stage: "open",
	});
	const alsoLinked = [...linked, { changeId: "change-2", pieceId: "piece-1", purpose: "produces" as const }];
	expect(holding([REEF_BERTH], [withdrawn, replacement], REGISTRY, alsoLinked).size).toBe(1);
	expect(holding([REEF_BERTH], [withdrawn, replacement], REGISTRY, alsoLinked, new Set(["change-1"])).size).toBe(0);
});

it("a berth on another branch of the same repo is not held", () => {
	const sibling = berth("keeper:sibling", "work/keeper/berth-1", REEF);
	expect(holding([sibling], [onReef("open")], REGISTRY, linked).size).toBe(0);
});

it("a berth on the same branch name in another repo is not held", () => {
	const elsewhere = berth("keeper:shoal", BRANCH, SHOAL);
	expect(holding([elsewhere], [onReef("open")], REGISTRY, linked).size).toBe(0);
});

it("a berth cut from a source no longer registered is not held", () => {
	expect(holding([REEF_BERTH], [onReef("open")], [SHOAL], linked).size).toBe(0);
});

it("the berth holding no change at all is simply absent", () => {
	expect(holding([REEF_BERTH], [], REGISTRY, []).size).toBe(0);
});

it("a replacement holds a withdrawn change only through a shared Piece", () => {
	const withdrawn = onReef("withdrawn");
	const replacement = changeOf({ headRef: "work/replacement", id: "replacement", repoId: REEF.id, stage: "prepared" });
	const separate = [...linked, { changeId: replacement.id, pieceId: "piece-2", purpose: "produces" as const }];
	expect(holding([REEF_BERTH], [withdrawn, replacement], REGISTRY, separate).size).toBe(0);
	const shared = [...separate, { changeId: withdrawn.id, pieceId: "piece-2", purpose: "produces" as const }];
	expect(holding([REEF_BERTH], [withdrawn, replacement], REGISTRY, shared)).toEqual(new Map([[REEF_BERTH.id, withdrawn.id]]));
});

it("the first backing Change determines the hold reason regardless of link order", () => {
	const first = onReef("open");
	const second = { ...first, id: "change-2" };
	const reversedLinks = [{ changeId: second.id, pieceId: "piece-2", purpose: "produces" as const }, ...linked];
	expect(holding([REEF_BERTH], [first, second], REGISTRY, reversedLinks)).toEqual(new Map([[REEF_BERTH.id, first.id]]));
});
