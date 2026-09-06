import { Database } from "@antumbra/persistence";
import { Effect, Option, Schema } from "effect";
import { SMOOTH_PIECE_TAG, SMOOTH_TAG } from "#smoothing/fields.ts";

const voyageOf = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ voyageId: Schema.String })));

const pieceOf = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ pieceId: Schema.String })));

const subjectsOf = <A>(payloads: ReadonlyArray<{ readonly payload: string }>, read: (payload: string) => Option.Option<A>): ReadonlySet<A> =>
	new Set(payloads.flatMap((row) => Option.toArray(read(row.payload))));

export const voyagePassesFor = Effect.fnUntraced(function* (voyageId: string) {
	const db = yield* Database;
	const passes = yield* db.Intent.where({ tag: SMOOTH_TAG })
		.orderBy((intent) => intent.updatedAt.desc())
		.all();
	return passes.filter((pass) =>
		Option.contains(
			Option.map(voyageOf(pass.payload), (payload) => payload.voyageId),
			voyageId,
		),
	);
});

export const voyagesPassedSince = Effect.fnUntraced(function* (millis: number) {
	const db = yield* Database;
	const passes = yield* db.Intent.where({ tag: SMOOTH_TAG })
		.where((intent) => intent.createdAt.gte(new Date(millis)))
		.select("payload")
		.all();
	return subjectsOf(passes, (payload) => Option.map(voyageOf(payload), (fields) => fields.voyageId));
});

export const piecesAttempted = Effect.fnUntraced(function* () {
	const db = yield* Database;
	const passes = yield* db.Intent.where({ tag: SMOOTH_PIECE_TAG }).select("payload").all();
	return subjectsOf(passes, (payload) => Option.map(pieceOf(payload), (fields) => fields.pieceId));
});
