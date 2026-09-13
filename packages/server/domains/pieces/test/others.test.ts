import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef } from "#test/kit.ts";

it.app("a Piece may wait on the other Pieces of its Voyage and never on itself", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering("soundings"));
	yield* app.api.pieces.charter(chartering("charts"));
	const others = yield* answered(app.api.pieces.others({ id: pieceOf("soundings"), voyageId: reef }));
	expect(others.map((piece) => piece.title)).toEqual(["charts"]);
});
