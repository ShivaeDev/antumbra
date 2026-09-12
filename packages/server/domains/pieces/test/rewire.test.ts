import { Effect } from "effect";
import { expect } from "vitest";
import { answered, type Chart, chartering, it, opening, pieceOf, reef } from "#test/kit.ts";

const wiredTo = (app: Chart) =>
	Effect.map(answered(app.api.pieces.edges({ voyageId: reef })), (wires) => wires.map((wire) => `${wire.from} -> ${wire.to}`));

const charted = Effect.fnUntraced(function* (app: Chart) {
	yield* app.api.voyages.open(opening);
	for (const name of ["soundings", "charts", "beacons"]) {
		yield* app.api.pieces.charter(chartering(name));
		yield* app.clock.advance(60_000);
	}
});

it.app("rewiring replaces everything a piece waits on", function* (app) {
	yield* charted(app);
	yield* app.api.pieces.rewire({ dependsOn: [pieceOf("soundings")], id: pieceOf("charts") });

	yield* app.api.pieces.rewire({ dependsOn: [pieceOf("beacons")], id: pieceOf("charts") });

	expect(yield* wiredTo(app)).toEqual([`${pieceOf("beacons")} -> ${pieceOf("charts")}`]);
});

it.app("refuses a rewire that would make a piece wait on work that waits on it", function* (app) {
	yield* charted(app);
	yield* app.api.pieces.rewire({ dependsOn: [pieceOf("soundings")], id: pieceOf("charts") });

	const refused = yield* Effect.flip(app.api.pieces.rewire({ dependsOn: [pieceOf("charts")], id: pieceOf("soundings") }));

	expect(refused).toMatchObject({
		_tag: "WouldCycle",
		field: "dependsOn",
		from: pieceOf("charts"),
		message: "A piece cannot wait on work that waits on it",
		to: pieceOf("soundings"),
	});
	expect(yield* wiredTo(app)).toEqual([`${pieceOf("soundings")} -> ${pieceOf("charts")}`]);
});
