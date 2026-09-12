import { answered, it } from "@antumbra/app-testing/entry.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef } from "#test/kit.ts";

it.app("posture and outcome evidence update Piece and Voyage progress together", function* (app) {
	yield* app.api.voyages.open(opening);
	expect(yield* answered(app.api.voyages.progress({ id: reef }))).toMatchObject({ concluded: false, state: "quiet", counts: { held: 0 } });
	yield* app.api.pieces.charter(chartering("soundings"));
	const id = pieceOf("soundings");
	expect(yield* answered(app.api.pieces.progress({ id }))).toMatchObject({ state: "held", concluded: false });
	yield* app.api.pieces.launch({ id });
	expect(yield* answered(app.api.pieces.progress({ id }))).toMatchObject({ state: "ready" });
	yield* app.api.pieces.park({ id });
	expect(yield* answered(app.api.pieces.progress({ id }))).toMatchObject({ state: "parked" });
	yield* app.api.pieces.landVerdict({ id, verdict: "delivered" });
	expect(yield* answered(app.api.pieces.progress({ id }))).toMatchObject({ state: "done", settledDone: true, concluded: true });
	expect(yield* answered(app.api.voyages.progress({ id: reef }))).toMatchObject({ concluded: true, counts: { done: 1, parked: 0, held: 0 } });
});

it.app("abandoning a prerequisite releases a Piece in another Voyage", function* (app) {
	const other = VoyageId.make("voyage:harbour");
	yield* app.api.voyages.open(opening);
	yield* app.api.voyages.open({ ...opening, name: "Harbour", requestId: Id.Request.make(other) });
	yield* app.api.pieces.charter(chartering("soundings"));
	yield* app.api.pieces.charter({ ...chartering("charts", [pieceOf("soundings")]), voyageId: other });
	yield* app.api.pieces.launch({ id: pieceOf("charts") });
	expect(yield* answered(app.api.pieces.progress({ id: pieceOf("charts") }))).toMatchObject({ state: "blocked" });
	yield* app.api.pieces.landVerdict({ id: pieceOf("soundings"), verdict: "abandoned" });
	expect(yield* answered(app.api.pieces.progress({ id: pieceOf("charts") }))).toMatchObject({ state: "ready" });
	expect(yield* answered(app.api.voyages.progress({ id: reef }))).toMatchObject({ concluded: true, counts: { abandoned: 1 } });
	expect(yield* answered(app.api.voyages.progress({ id: other }))).toMatchObject({ concluded: false, counts: { blocked: 0, ready: 1 } });
});
