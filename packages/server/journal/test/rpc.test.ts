import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { ClientToken, Unauthorized } from "@antumbra/platform-rpc/token.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option, Queue, Stream } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { expect } from "vitest";
import { Database } from "#database.ts";
import { park } from "#example/commands/park.ts";
import { elsewhere, it, launched, pieceApp, pieceId, voyage } from "#test/kit.ts";

const emissions = Stream.toQueue({ capacity: "unbounded" });

it.app("a command through the client answers with the sequence number, moves the row and writes the fact", function* (app) {
	const database = yield* Database;
	yield* app.seed.piece(launched(1));
	const seq = yield* app.api.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	expect(seq).toBe(1);
	expect((yield* app.rows.piece.get(pieceId(1))).status).toBe("parked");
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
	expect(facts).toHaveLength(1);
	expect(facts[0]).toMatchObject({ name: "PieceParked", seq });
});

it.app("a rejection reaches the client as the class the command declared", function* (app) {
	yield* app.seed.piece({ ...launched(1), status: "chartered" });
	const rejection = yield* Effect.flip(app.api.pieces.park({ pieceId: pieceId(1), reason: "too early" }));
	expect(rejection).toBeInstanceOf(park.Rejection.PieceNotLaunched);
	expect(rejection).toMatchObject({ _tag: "PieceNotLaunched", pieceId: pieceId(1), status: "chartered" });
});

it.app("the same request id twice answers on the wire with the sequence number it already produced", function* (app) {
	yield* app.seed.piece(launched(1));
	const calls = yield* RpcTest.makeClient(group(pieceApp.features), { flatten: true });
	const requestId = Id.Request.make("request-1");
	const input = { pieceId: pieceId(1), reason: "blocked on review", requestId };
	const seq = yield* calls("pieces.park", input);
	const refused = yield* Effect.flip(calls("pieces.park", input));
	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId, seq });
});

it.app("the request id the caller fixes is the one the journal applies", function* (app) {
	const database = yield* Database;
	yield* app.seed.piece(launched(1));
	yield* app.seed.piece(launched(2));
	const requestId = Id.Request.make("voyage:flagship");
	const seq = yield* app.api.pieces.park({ pieceId: pieceId(1), reason: "blocked on review", requestId });

	expect(yield* app.api.pieces.park({ pieceId: pieceId(2), reason: "blocked on review", requestId })).toBe(seq);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(1);
	expect((yield* app.rows.piece.get(pieceId(2))).status).toBe("launched");
});

it.app("a call that names no request id is minted one of its own", function* (app) {
	const database = yield* Database;
	yield* app.seed.piece(launched(1));
	yield* app.seed.piece(launched(2));
	yield* app.api.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	yield* app.api.pieces.park({ pieceId: pieceId(2), reason: "blocked on review" });

	const applied = yield* Effect.orDie(database.write`SELECT * FROM "applied"`);
	expect(new Set(applied.map((entry) => String(entry.requestId))).size).toBe(2);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(2);
});

it.app("a live query through the client emits the rows it watches and emits again when its scope is dirtied", function* (app) {
	yield* app.seed.piece(launched(1));
	yield* app.seed.piece(launched(2, elsewhere));
	const seen = yield* emissions(app.api.pieces.byVoyage({ voyageId: voyage }));
	expect(yield* Queue.take(seen)).toHaveLength(1);
	yield* app.api.pieces.park({ pieceId: pieceId(2), reason: "another voyage" });
	yield* app.api.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	expect((yield* Queue.take(seen)).at(0)?.status).toBe("parked");
});

it.app("the atom for a live query holds the latest result and is the same atom for the same input", function* (app) {
	yield* app.seed.piece(launched(1));
	const atom = app.api.pieces.byVoyage.atom({ voyageId: voyage });
	expect(app.api.pieces.byVoyage.atom({ voyageId: voyage })).toBe(atom);
	const seen = yield* emissions(Atom.toStreamResult(atom));
	expect(yield* Queue.take(seen)).toHaveLength(1);
	yield* app.api.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	expect((yield* Queue.take(seen)).at(0)?.status).toBe("parked");
	expect(Option.getOrUndefined(AsyncResult.value(yield* Atom.get(atom)))?.at(0)?.status).toBe("parked");
});

it.app("a call carrying the wrong token is refused and the right one passes", function* (app) {
	yield* app.seed.piece(launched(1));
	const call = app.api.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	const refused = yield* Effect.flip(call.pipe(Effect.provideService(ClientToken, { token: "wrong" })));
	expect(refused).toBeInstanceOf(Unauthorized);
	expect(yield* call).toBe(1);
});
