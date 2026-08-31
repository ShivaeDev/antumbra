import { expect, it } from "@effect/vitest";
import { wouldCycle } from "#graph.ts";

it("wouldCycle refuses a self-loop and a closing edge", () => {
	expect(wouldCycle([], "a", "a")).toBe(true);
	const chain = [
		{ fromPieceId: "a", toPieceId: "b" },
		{ fromPieceId: "b", toPieceId: "c" },
	];
	expect(wouldCycle(chain, "c", "a")).toBe(true);
	expect(wouldCycle(chain, "a", "c")).toBe(false);
});
