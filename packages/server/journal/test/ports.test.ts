import { expect } from "vitest";
import { PieceId, VoyageId } from "#example/ids.ts";
import { chartered } from "#example/queries/chartered.ts";
import { example } from "#test/harness.ts";

const VOYAGE = VoyageId.make("voyage-1");
const FIRST = PieceId.make("piece-1");
const SECOND = PieceId.make("piece-2");

example("a query reads its port on every run and re-runs when its rows change", function* (app) {
	yield* app.roster.sail(["mate", "bosun"]);
	yield* app.commit.pieces.charter({ pieceId: FIRST, title: "first", voyageId: VOYAGE });
	const watching = yield* app.live(chartered, {});
	yield* app.settle();
	expect((yield* watching.seen).at(-1)).toEqual({ crew: ["mate", "bosun"], pieces: [FIRST] });
	yield* app.roster.sail(["cook"]);
	yield* app.commit.pieces.charter({ pieceId: SECOND, title: "second", voyageId: VOYAGE });
	yield* app.settle();
	const latest = yield* watching.seen;
	expect(latest.at(-1)?.crew).toEqual(["cook"]);
	expect([...(latest.at(-1)?.pieces ?? [])].toSorted()).toEqual([FIRST, SECOND]);
});
