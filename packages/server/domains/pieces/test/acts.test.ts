import { Effect } from "effect";
import { expect } from "vitest";
import { answered, type Chart, chartering, it, opening, pieceOf } from "#test/kit.ts";

const soundings = pieceOf("soundings");

const read = (app: Chart) => answered(app.api.pieces.byId({ id: soundings }));

it.app("a piece launches, parks and unparks, and repeating an act leaves it where it stands", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering("soundings"));

	yield* app.api.pieces.launch({ id: soundings });
	const launched = (yield* read(app))?.launchedAt;
	expect(launched).not.toBeNull();

	yield* app.clock.advance(60_000);
	yield* app.api.pieces.launch({ id: soundings });
	expect((yield* read(app))?.launchedAt).toBe(launched);

	yield* app.api.pieces.park({ id: soundings });
	const parked = (yield* read(app))?.parkedAt;
	expect(parked).not.toBeNull();

	yield* app.clock.advance(60_000);
	yield* app.api.pieces.park({ id: soundings });
	expect((yield* read(app))?.parkedAt).toBe(parked);

	yield* app.api.pieces.unpark({ id: soundings });
	expect(yield* read(app)).toMatchObject({ launchedAt: launched, parkedAt: null });
});

it.app("a landed verdict stands on the piece", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering("soundings"));

	yield* app.api.pieces.landVerdict({ id: soundings, verdict: "delivered" });

	expect(yield* read(app)).toMatchObject({ verdict: "delivered" });
});

it.app("refuses an act on a piece the fleet does not hold", function* (app) {
	const refused = yield* Effect.flip(app.api.pieces.launch({ id: pieceOf("nowhere") }));

	expect(refused).toMatchObject({ _tag: "Unknown", id: pieceOf("nowhere") });
});
