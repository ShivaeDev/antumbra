import { expect, it } from "@effect/vitest";
import { admiralWords } from "#admiral.ts";
import { checksFailed, mergeConflicts, unresolvedReviews } from "#situations.ts";
import { wakeWords } from "#wake.ts";

const FACTS = {
	headRef: "chart-the-shoals",
	reference: "#42",
	repo: "Reef-Charts",
};

it("the conflict template names both branches and asks for a clean merge", () => {
	const text = mergeConflicts({ ...FACTS, baseRef: "main" });
	expect(text).toContain("#42");
	expect(text).toContain("Reef-Charts");
	expect(text).toContain("chart-the-shoals");
	expect(text).toContain("main");
	expect(text).toContain("resolve the conflicts");
});

it("the checks template points at the host and forbids weakening a check", () => {
	const text = checksFailed(FACTS);
	expect(text).toContain("#42");
	expect(text).toContain("chart-the-shoals");
	expect(text).toContain("Read the failing checks on the change");
	expect(text).toContain("Never disable, skip, or weaken a check");
});

it("the review template asks for an answer to every unresolved thread", () => {
	const text = unresolvedReviews(FACTS);
	expect(text).toContain("#42");
	expect(text).toContain("Read the unresolved threads on the change");
	expect(text).toContain("answer every one");
});

// why: the record holds a rolled-up word per Change, never the names of the
// checks or the text of a thread. A template that spelled either would be
// carrying a fact Antumbra does not have, so the situations point at the host
// instead — and that is the property under test, not a wording preference.
it("no situation invents host detail the record does not hold", () => {
	const every = [mergeConflicts({ ...FACTS, baseRef: "main" }), checksFailed(FACTS), unresolvedReviews(FACTS)];
	for (const text of every) {
		expect(text).toContain("#42");
		expect(text).not.toContain("undefined");
	}
});

it("the wake instruction is one fixed sentence with no blanks", () => {
	expect(wakeWords).toBe("Reconcile durable Antumbra truth and continue your assigned work.");
});

it("the admiral's own words pass through the catalog unchanged", () => {
	expect(admiralWords({ words: "  come about, now  " })).toBe("  come about, now  ");
});
