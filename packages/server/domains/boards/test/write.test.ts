import { answered, it } from "@antumbra/app-testing/entry.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { voyageBoard } from "#ids.ts";
import { chartering, noting, opening, reefBoard, soundingsBoard } from "#test/kit.ts";

it.app("gives every entry the next number its board has open", function* (app) {
	yield* app.api.voyages.open(opening);

	yield* app.api.boards.write(noting("swell", "the swell is running"));
	yield* app.api.boards.write(noting("buoy", "the channel buoy is adrift"));

	const written = yield* answered(app.api.boards.entries({ board: reefBoard }));
	expect(written.map((entry) => [entry.seq, entry.body])).toEqual([
		[1, "the swell is running"],
		[2, "the channel buoy is adrift"],
	]);
	expect(written[0]).toMatchObject({ authorAgentId: "agent-hand", kind: "note", pieceId: null, register: "rough" });
});

it.app("refuses an entry on a board whose owner the fleet does not hold and stores nothing", function* (app) {
	const refused = yield* Effect.flip(app.api.boards.write(noting("adrift", "nobody reads this", voyageBoard(VoyageId.make("voyage-nowhere")))));

	expect(refused).toMatchObject({ _tag: "UnknownBoard" });
	expect(yield* app.rows.boardEntry.count({})).toBe(0);
});

it.app("refuses an entry with nothing said and stores nothing", function* (app) {
	yield* app.api.voyages.open(opening);

	const refused = yield* Effect.flip(app.api.boards.write({ ...noting("blank", "   ") }));

	expect(refused).toMatchObject({ _tag: "Blank", field: "body", message: "An entry needs a body" });
	expect(yield* app.rows.boardEntry.count({})).toBe(0);
});

it.app("writes one entry however often the request that named it arrives", function* (app) {
	yield* app.api.voyages.open(opening);

	const first = yield* app.api.boards.write(noting("swell", "the swell is running"));
	const again = yield* app.api.boards.write(noting("swell", "the swell is running"));

	expect(again).toBe(first);
	expect(yield* app.rows.boardEntry.count({})).toBe(1);
});

it.app("keeps a voyage's board and its piece's board apart", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);

	yield* app.api.boards.write(noting("swell", "the swell is running"));
	yield* app.api.boards.write(noting("shoal", "the shoal shelves fast", soundingsBoard));

	expect((yield* answered(app.api.boards.entries({ board: reefBoard }))).map((entry) => entry.body)).toEqual(["the swell is running"]);
	expect((yield* answered(app.api.boards.entries({ board: soundingsBoard }))).map((entry) => entry.body)).toEqual(["the shoal shelves fast"]);
});
