import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { Database } from "#database.ts";
import { PieceId, VoyageId } from "#example/ids.ts";
import { example } from "#test/harness.ts";

const pieceId = PieceId.make("soundings");
const charter = { pieceId, voyageId: VoyageId.make("reef"), title: "Sound the reef", requestId: Request.make("charter") };

example("commits store provenance and update the stored reading", function* (app) {
	const database = yield* Database;
	yield* app.clock.advance(1_700_000);
	const seq = yield* app.commit.pieces.charter(charter);
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal" WHERE "requestId" = ${charter.requestId}`);
	expect(facts).toHaveLength(1);
	expect(facts[0]).toMatchObject({ at: 1_700_000, name: "PieceChartered", requestId: charter.requestId, seq });
	expect(JSON.parse(String(facts[0]?.payload))).toEqual({ pieceId, voyageId: charter.voyageId, title: charter.title });
	expect(yield* app.rows.piece.get(pieceId)).toMatchObject({ id: pieceId, title: charter.title });
});

example("rejected commands leave durable state unchanged", function* (app) {
	const database = yield* Database;
	yield* app.commit.pieces.charter(charter);
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
	const applied = yield* Effect.orDie(database.write`SELECT * FROM "applied"`);
	const rejection = yield* Effect.flip(app.commit.pieces.launch({ pieceId: PieceId.make("absent") }));
	expect(rejection).toMatchObject({ _tag: "PieceNotFound", pieceId: "absent" });
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toEqual(facts);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toEqual(applied);
	expect(yield* app.rows.piece.get(pieceId)).toMatchObject({ status: "chartered" });
});

example("commits reject repeated requests without writing again", function* (app) {
	const database = yield* Database;
	const seq = yield* app.commit.pieces.charter(charter);
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
	const applied = yield* Effect.orDie(database.write`SELECT * FROM "applied"`);
	const refused = yield* Effect.flip(app.commit.pieces.charter({ ...charter, title: "A later title" }));
	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId: charter.requestId, seq });
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toEqual(facts);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toEqual(applied);
	expect(yield* app.rows.piece.get(pieceId)).toMatchObject({ title: charter.title });
});
