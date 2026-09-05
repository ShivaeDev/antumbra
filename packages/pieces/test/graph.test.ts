import { expect, it } from "@effect/vitest";
import { reachablePieces } from "#graph.ts";

it("finds the starting piece and its downstream Pieces", () => {
	expect(reachablePieces([], "a")).toEqual(new Set(["a"]));
	const chain = [
		{ fromPieceId: "a", toPieceId: "b" },
		{ fromPieceId: "b", toPieceId: "c" },
		{ fromPieceId: "a", toPieceId: "d" },
	];
	expect(reachablePieces(chain, "a")).toEqual(new Set(["a", "b", "c", "d"]));
	expect(reachablePieces(chain, "b")).toEqual(new Set(["b", "c"]));
});
