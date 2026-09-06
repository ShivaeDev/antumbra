import { AlreadyDone } from "@antumbra/journal";
import * as Id from "@antumbra/vocabulary/id";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { Commit } from "#commit.ts";
import { Database } from "#database.ts";
import { park } from "#example/commands/park.ts";
import * as Journal from "#journal.ts";
import { launched, pieceApp, pieceId } from "#test/kit.ts";
import { kit } from "#testing/kit.ts";

const layer = Layer.provideMerge(Journal.layer(pieceApp), Journal.memory());

it.effect("the journal holds the fact with its time, its request and its payload", () =>
	Effect.gen(function* () {
		const parts = yield* kit(pieceApp);
		const database = yield* Database;
		yield* parts.clock.advance(1_700_000);
		yield* parts.seed.piece(launched(1));
		const seq = yield* parts.commit.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
		const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
		expect(facts).toHaveLength(1);
		expect(facts[0]).toMatchObject({ at: 1_700_000, name: "PieceParked", seq });
		expect(JSON.parse(String(facts[0]?.payload))).toEqual({ pieceId: "piece-1", reason: "blocked on review" });
		expect(String(facts[0]?.requestId)).toHaveLength(36);
	}).pipe(Effect.provide(layer), Effect.orDie),
);

it.effect("a rejected command writes no fact, no row and no applied entry", () =>
	Effect.gen(function* () {
		const parts = yield* kit(pieceApp);
		const database = yield* Database;
		yield* parts.seed.piece({ ...launched(1), status: "chartered" });
		yield* Effect.flip(parts.commit.pieces.park({ pieceId: pieceId(1), reason: "too early" }));
		expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(0);
		expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toHaveLength(0);
		expect((yield* parts.rows.piece.get(pieceId(1))).status).toBe("chartered");
	}).pipe(Effect.provide(layer), Effect.orDie),
);

it.effect("a repeated request id is refused with the sequence number it already produced", () =>
	Effect.gen(function* () {
		const parts = yield* kit(pieceApp);
		const database = yield* Database;
		const commit = yield* Commit;
		yield* parts.seed.piece(launched(1));
		const requestId = Id.Request.make("request-1");
		const seq = yield* commit.commit(park, { pieceId: pieceId(1), reason: "blocked on review", requestId });
		const refused = yield* Effect.flip(commit.commit(park, { pieceId: pieceId(1), reason: "blocked on review", requestId }));
		expect(refused).toBeInstanceOf(AlreadyDone);
		expect(refused).toMatchObject({ requestId, seq });
		expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(1);
		expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toHaveLength(1);
	}).pipe(Effect.provide(layer), Effect.orDie),
);
