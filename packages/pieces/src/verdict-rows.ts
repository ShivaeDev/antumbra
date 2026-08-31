import { Database, type PrismaError } from "@antumbra/persistence";
import { type PieceVerdict, PieceVerdict as PieceVerdictSchema } from "@antumbra/vocabulary/verdict";
import { type Context, Effect, Schema } from "effect";
import { StoredPieceVerdictInvalid } from "#errors.ts";

export type { PieceVerdict };

const pieceVerdictRow = (row: { readonly pieceId: string; readonly verdict: string }) =>
	Schema.decodeUnknownEffect(PieceVerdictSchema)(row.verdict).pipe(
		Effect.mapError(
			(cause) =>
				new StoredPieceVerdictInvalid({
					detail: `${String(cause)}; stored verdict ${JSON.stringify(row.verdict)}`,
					pieceId: row.pieceId,
				}),
		),
		Effect.map((verdict) => [row.pieceId, verdict] as const),
	);

export const readPieceVerdicts: Effect.Effect<
	ReadonlyMap<string, PieceVerdict>,
	PrismaError | StoredPieceVerdictInvalid,
	Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const db = yield* Database;
	return new Map(yield* Effect.forEach(yield* db.PieceVerdict.all(), pieceVerdictRow));
});
