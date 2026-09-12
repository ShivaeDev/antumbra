import { answered, it } from "@antumbra/app-testing/entry.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef } from "#test/kit.ts";

it.app("a chartered piece joins its voyage and waits on the pieces it names", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering("soundings"));
	yield* app.clock.advance(60_000);
	yield* app.api.pieces.charter(chartering("charts", [pieceOf("soundings")]));

	const listed = yield* answered(app.api.pieces.byVoyage({ voyageId: reef }));
	expect(listed.map((row) => row.title)).toEqual(["soundings", "charts"]);
	expect(listed[1]).toMatchObject({ charter: "sound charts", expectation: "charts is landed", role: "hand", verdict: null });
	expect(yield* answered(app.api.pieces.edges({ voyageId: reef }))).toEqual([
		{ from: pieceOf("soundings"), id: `${pieceOf("soundings")}/${pieceOf("charts")}`, to: pieceOf("charts") },
	]);
});

it.app("refuses a piece on a voyage the fleet does not hold and stores nothing", function* (app) {
	const refused = yield* Effect.flip(app.api.pieces.charter({ ...chartering("adrift"), voyageId: VoyageId.make("voyage-nowhere") }));

	expect(refused).toMatchObject({ _tag: "UnknownVoyage", voyageId: "voyage-nowhere" });
	expect(yield* app.rows.piece.count({})).toBe(0);
});

it.app("refuses a piece waiting on work the fleet does not hold and stores nothing", function* (app) {
	yield* app.api.voyages.open(opening);

	const refused = yield* Effect.flip(app.api.pieces.charter(chartering("adrift", [pieceOf("nowhere")])));

	expect(refused).toMatchObject({ _tag: "UnknownDependency", pieceId: pieceOf("nowhere") });
	expect(yield* app.rows.piece.count({})).toBe(0);
	expect(yield* app.rows.pieceEdge.count({})).toBe(0);
});

it.app("refuses a piece with nothing said in the fields a piece needs", function* (app) {
	yield* app.api.voyages.open(opening);

	const refused = yield* Effect.flip(app.api.pieces.charter({ ...chartering("blank"), title: "   " }));

	expect(refused).toMatchObject({ _tag: "Blank", field: "title", message: "A piece needs a title" });
	expect(yield* app.rows.piece.count({})).toBe(0);
});

it.app("charters one piece however often the request that named it arrives", function* (app) {
	yield* app.api.voyages.open(opening);

	const first = yield* app.api.pieces.charter(chartering("soundings"));
	const again = yield* app.api.pieces.charter(chartering("soundings"));

	expect(again).toBe(first);
	expect(yield* answered(app.api.pieces.byId({ id: pieceOf("soundings") }))).toMatchObject({ title: "soundings" });
	expect(yield* app.rows.piece.count({})).toBe(1);
});
