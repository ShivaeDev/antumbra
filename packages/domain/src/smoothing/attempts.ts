import { Database } from "@antumbra/persistence";
import { Effect, Option, Schema } from "effect";
import { SMOOTH_PIECE_TAG, SMOOTH_TAG } from "#smoothing/fields.ts";

const voyageOf = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ voyageId: Schema.String })));

const pieceOf = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ pieceId: Schema.String })));

const smoothPasses = Effect.fnUntraced(function* (tag: string) {
	const db = yield* Database;
	return yield* db.Intent.where({ tag })
		.orderBy((intent) => intent.updatedAt.desc())
		.all();
});

export const voyagePassesFor = Effect.fnUntraced(function* (voyageId: string) {
	const passes = yield* smoothPasses(SMOOTH_TAG);
	return passes.filter((pass) =>
		Option.contains(
			Option.map(voyageOf(pass.payload), (payload) => payload.voyageId),
			voyageId,
		),
	);
});

export const voyagesPassedSince = Effect.fnUntraced(function* (millis: number) {
	const passes = yield* smoothPasses(SMOOTH_TAG);
	return new Set(
		passes.flatMap((pass) =>
			pass.createdAt.getTime() < millis ? [] : Option.toArray(Option.map(voyageOf(pass.payload), (payload) => payload.voyageId)),
		),
	);
});

export const piecesAttempted = Effect.fnUntraced(function* () {
	const passes = yield* smoothPasses(SMOOTH_PIECE_TAG);
	return new Set(passes.flatMap((pass) => Option.toArray(Option.map(pieceOf(pass.payload), (payload) => payload.pieceId))));
});
