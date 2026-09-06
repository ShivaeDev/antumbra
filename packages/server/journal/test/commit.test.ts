import { RowNotFound } from "@antumbra/journal";
import { Cause, Effect } from "effect";
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

it.app("a rejection is the class the command declared", function* (app) {
	yield* app.seed.piece({ ...launched(1), status: "chartered" });
	const rejection = yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(1), reason: "too early" }));
	expect(rejection).toBeInstanceOf(park.Rejection.PieceNotLaunched);
	expect(rejection).toMatchObject({ _tag: "PieceNotLaunched", pieceId: pieceId(1), status: "chartered" });
});

it.app("a rejected command leaves the projection row alone", function* (app) {
	yield* app.seed.piece({ ...launched(1), status: "chartered" });
	yield* Effect.flip(app.commit.pieces.park({ pieceId: pieceId(1), reason: "too early" }));
	expect((yield* app.rows.piece.get(pieceId(1))).status).toBe("chartered");
});

it.app("a guard that reads a row nobody wrote is a defect, not a rejection", function* (app) {
	const cause = yield* Effect.flip(Effect.sandbox(app.commit.pieces.park({ pieceId: pieceId(9), reason: "gone" })));
	expect(Cause.hasDies(cause)).toBe(true);
	expect(Cause.squash(cause)).toBeInstanceOf(RowNotFound);
});
