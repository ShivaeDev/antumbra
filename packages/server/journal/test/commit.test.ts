import { RowNotFound } from "@antumbra/platform-feature/rejection.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Cause, Effect, Option } from "effect";
import { expect } from "vitest";
import { park } from "#example/commands/park.ts";
import { it, launched, pieceId } from "#test/kit.ts";

it.app("a commit returns the sequence number and moves the projection row", function* (app) {
	yield* app.seed.piece(launched(1));
	const seq = yield* app.commit.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
	expect(seq).toBe(1);
	const found = yield* app.rows.piece.get(pieceId(1));
	expect(found.status).toBe("parked");
	expect(found.parkedReason).toBe("blocked on review");
});

it.app("the test kit commits under the request id the caller fixes", function* (app) {
	yield* app.seed.piece(launched(1));
	const requestId = Id.Request.make("voyage:flagship");
	const seq = yield* app.commit.pieces.park({ pieceId: pieceId(1), reason: "blocked on review", requestId });
	const refused = yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(1), reason: "again", requestId }));

	expect(refused).toMatchObject({ _tag: "AlreadyDone", requestId, seq });
});

it.app("a rejection is the class the command declared", function* (app) {
	yield* app.seed.piece({ ...launched(1), status: "chartered" });
	const rejection = yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(1), reason: "too early" }));
	expect(rejection).toBeInstanceOf(park.Rejection.PieceNotLaunched);
	expect(rejection).toMatchObject({ _tag: "PieceNotLaunched", pieceId: pieceId(1), status: "chartered" });
});

it.app("an id the glass carried too long is the rejection the command declared", function* (app) {
	const rejection = yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(9), reason: "gone" }));
	expect(rejection).toBeInstanceOf(park.Rejection.PieceNotFound);
	expect(rejection).toMatchObject({ _tag: "PieceNotFound", pieceId: pieceId(9) });
});

it.app("a row that is not there is an empty option, not a defect", function* (app) {
	yield* app.seed.piece(launched(1));
	expect(Option.isSome(yield* app.rows.piece.find(pieceId(1)))).toBe(true);
	expect(Option.isNone(yield* app.rows.piece.find(pieceId(9)))).toBe(true);
});

it.app("a row the caller swore was there and is not is a defect, not a rejection", function* (app) {
	const cause = yield* Effect.flip(Effect.sandbox(app.rows.piece.get(pieceId(9))));
	expect(Cause.hasDies(cause)).toBe(true);
	expect(Cause.squash(cause)).toBeInstanceOf(RowNotFound);
});
