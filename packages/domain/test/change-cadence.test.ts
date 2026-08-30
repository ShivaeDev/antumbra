import type { ChangeRow } from "@antumbra/changes";
import { describe, expect, it } from "@effect/vitest";
import type { ObserveCadenceOptions } from "#change-cadence.ts";
import { nextObserveDelayMillis, retryObserveDelayMillis } from "#change-cadence.ts";

const row = (fields: Partial<ChangeRow>): ChangeRow => ({
	activityAt: new Date(0),
	baseRef: "main",
	body: "",
	checks: "none",
	draftAt: null,
	externalId: "1",
	headRef: "work/ab12cd34/reef",
	headSha: null,
	host: "scripted",
	id: "change-1",
	landedAt: null,
	mergeable: "unknown",
	observedAt: new Date(0),
	openedByAgentId: null,
	originSessionId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	proposalFrozenAt: null,
	raw: null,
	repoId: "repo-1",
	review: "none",
	stage: "open",
	submissionKey: null,
	title: "chart the eastern spit",
	url: null,
	withdrawnAt: null,
	workingDiff: null,
	workingTreeStatus: null,
	worktreePath: null,
	...fields,
});

const CADENCE: ObserveCadenceOptions = {
	coldMillis: 900,
	hotMillis: 30,
	hotWindowMillis: 600,
	warmMillis: 180,
};

describe("how soon the next pass is worth making", () => {
	const at = (open: ReadonlyArray<ChangeRow>) => nextObserveDelayMillis(open, 10_000, CADENCE);

	it("is hot while checks are still running", () => {
		expect(at([row({ checks: "pending" })])).toBe(30);
	});

	it("is hot just after somebody touched the change", () => {
		expect(at([row({ activityAt: new Date(9_500) })])).toBe(30);
		expect(at([row({ activityAt: new Date(9_400) })])).toBe(180);
	});

	it("is warm for an open change nobody is moving", () => {
		expect(at([row({ checks: "green" })])).toBe(180);
	});

	it("is cold when every open change is a draft", () => {
		expect(at([row({ draftAt: new Date(0) })])).toBe(900);
	});

	it("is cold when nothing is open at all", () => {
		expect(at([])).toBe(900);
	});

	it("is cold while only withdrawn changes await reconciliation", () => {
		expect(at([row({ checks: "pending", stage: "withdrawn" })])).toBe(900);
	});

	// why: one hot change is enough — a fleet is only as patient as the change
	// with the most to say, or a busy pull request would wait behind a draft.
	it("takes the shortest delay any open change asks for", () => {
		expect(at([row({ draftAt: new Date(0) }), row({ checks: "pending" })])).toBe(30);
	});
});

describe("how long a host that could not answer is left alone", () => {
	const after = (failures: number) => retryObserveDelayMillis(failures, CADENCE);

	it("waits the warm cadence after one lost answer", () => {
		expect(after(1)).toBe(180);
	});

	it("asks half as often for every failure that follows", () => {
		expect(after(2)).toBe(360);
		expect(after(3)).toBe(720);
	});

	// why: the ceiling is the cold cadence, so a host down all afternoon costs
	// what a fleet with nothing to say costs — and is still noticed within one
	// cold period of coming back.
	it("never waits longer than a fleet with nothing to say", () => {
		expect(after(4)).toBe(900);
		expect(after(40)).toBe(900);
	});
});
