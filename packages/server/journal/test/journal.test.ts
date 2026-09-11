import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { Commit } from "#commit.ts";
import { Database } from "#database.ts";
import { park } from "#example/commands/park.ts";
import { it, launched, pieceId } from "#test/kit.ts";

it.app("the journal holds the fact with its time, its request and its payload", function* (app) {
	const database = yield* Database;
	yield* app.clock.advance(1_700_000);
	yield* app.seed.piece(launched(1));
	const seq = yield* app.commit.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
	expect(facts).toHaveLength(1);
	expect(facts[0]).toMatchObject({ at: 1_700_000, name: "PieceParked", seq });
	expect(JSON.parse(String(facts[0]?.payload))).toEqual({ pieceId: "piece-1", reason: "blocked on review" });
	expect(String(facts[0]?.requestId)).toHaveLength(36);
});

it.app("a rejected command writes no fact, no row and no applied entry", function* (app) {
	const database = yield* Database;
	yield* app.seed.piece({ ...launched(1), status: "chartered" });
	yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(1), reason: "too early" }));
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(0);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toHaveLength(0);
	expect((yield* app.rows.piece.get(pieceId(1))).status).toBe("chartered");
});

it.app("a command that rejects an id nobody wrote writes nothing", function* (app) {
	const database = yield* Database;
	const rejection = yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(9), reason: "gone" }));
	expect(rejection).toBeInstanceOf(park.Rejection.PieceNotFound);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(0);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toHaveLength(0);
	expect(yield* app.rows.piece.count({})).toBe(0);
});

it.app("a repeated request id is refused with the sequence number it already produced", function* (app) {
	const database = yield* Database;
	const commit = yield* Commit;
	yield* app.seed.piece(launched(1));
	const requestId = Id.Request.make("request-1");
	const seq = yield* commit.commit(park, { pieceId: pieceId(1), reason: "blocked on review", requestId });
	const refused = yield* Effect.flip(commit.commit(park, { pieceId: pieceId(1), reason: "blocked on review", requestId }));
	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId, seq });
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(1);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toHaveLength(1);
});
