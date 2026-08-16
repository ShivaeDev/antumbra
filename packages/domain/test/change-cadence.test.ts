import { describe, expect, it } from "@effect/vitest";
import type { ObserveCadenceOptions } from "#change-cadence.ts";
import { nextObserveDelayMillis } from "#change-cadence.ts";
import type { ChangeRow } from "#change-rows.ts";

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
	raw: null,
	repoId: "repo-1",
	review: "none",
	stage: "open",
	title: "chart the eastern spit",
	url: null,
	withdrawnAt: null,
	...fields,
});

const CADENCE: ObserveCadenceOptions = {
	coldMillis: 900,
	hotMillis: 30,
	hotWindowMillis: 600,
	warmMillis: 180,
};

describe("how soon the next pass is worth making", () => {
	const at = (open: ReadonlyArray<ChangeRow>) =>
		nextObserveDelayMillis(open, 10_000, CADENCE);

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
		expect(
			at([row({ draftAt: new Date(0) }), row({ checks: "pending" })]),
		).toBe(30);
	});
});
