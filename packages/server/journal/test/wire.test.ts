import { AlreadyDone } from "@antumbra/feature/rejection.ts";
import { group } from "@antumbra/rpc/group.ts";
import { it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { expect } from "vitest";
import { park } from "#example/commands/park.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { pieces } from "#example/feature.ts";
import { PieceId } from "#example/ids.ts";

const through = <Value>(schema: Schema.Codec<Value, unknown>, value: Value): Effect.Effect<Value> =>
	Effect.gen(function* () {
		const encoded = yield* Schema.encodeUnknownEffect(schema)(value);
		return yield* Schema.decodeUnknownEffect(schema)(JSON.parse(JSON.stringify(encoded)));
	}).pipe(Effect.orDie);

it("the wire tags name the feature and the command or query they derive from", () => {
	expect([...group([pieces]).requests.keys()].toSorted()).toEqual(["pieces.byVoyage", "pieces.park"]);
});

it.effect("a rejection crosses json as the class the command declared", () =>
	Effect.gen(function* () {
		const rejection = new park.Rejection.PieceNotLaunched({ pieceId: PieceId.make("piece-1"), status: "chartered" });
		const arrived = yield* through(park.Rejection.PieceNotLaunched, rejection);
		expect(arrived).toBeInstanceOf(park.Rejection.PieceNotLaunched);
		expect(arrived).toMatchObject({ _tag: "PieceNotLaunched", pieceId: "piece-1", status: "chartered" });
	}),
);

it.effect("an already-done answer crosses json with the sequence number it carries", () =>
	Effect.gen(function* () {
		const arrived = yield* through(AlreadyDone, new AlreadyDone({ requestId: "request-1", seq: 3 }));
		expect(arrived).toBeInstanceOf(AlreadyDone);
		expect(arrived).toMatchObject({ requestId: "request-1", seq: 3 });
	}),
);

it.effect("a fact payload crosses json to an equal value", () =>
	Effect.gen(function* () {
		const payload = { pieceId: PieceId.make("piece-1"), reason: "blocked on review" };
		expect(yield* through(pieceParked.Payload, payload)).toEqual(payload);
	}),
);
