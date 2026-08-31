import { expect, it } from "@effect/vitest";
import { checksFailed, mergeConflicts, unresolvedReviews } from "#situations.ts";

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
