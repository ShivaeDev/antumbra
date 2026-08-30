import { expect, it } from "@effect/vitest";
import { idleSessionsPastThreshold } from "#session-idle.ts";

it("selects sessions beyond the supplied idle threshold", () => {
	const now = 10_000;
	const overdue = idleSessionsPastThreshold(
		new Map([
			["shorter", 6_000],
			["longer", 4_000],
		]),
		now,
		5_000,
	);

	expect(overdue).toEqual(new Set(["longer"]));
});
