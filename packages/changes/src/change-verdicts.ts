import { Database, type PrismaError } from "@antumbra/persistence";
import { type ChangeVerdict, ChangeVerdict as ChangeVerdictSchema } from "@antumbra/vocabulary/verdict";
import { type Context, Effect, Schema } from "effect";
import { StoredChangeVerdictInvalid } from "#errors.ts";

export interface ChangeVerdictRow {
	readonly changeId: string;
	readonly verdict: ChangeVerdict;
}

export const changeVerdictRow = (row: { readonly changeId: string; readonly verdict: string }) =>
	Schema.decodeUnknownEffect(ChangeVerdictSchema)(row.verdict).pipe(
		Effect.mapError(
			(cause) =>
				new StoredChangeVerdictInvalid({
					changeId: row.changeId,
					detail: `${String(cause)}; stored verdict ${JSON.stringify(row.verdict)}`,
				}),
		),
		Effect.map((verdict): ChangeVerdictRow => ({ changeId: row.changeId, verdict })),
	);

export const readDismissedChangeIds: Effect.Effect<
	ReadonlySet<string>,
	PrismaError | StoredChangeVerdictInvalid,
	Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* Effect.forEach(yield* db.ChangeVerdict.all(), changeVerdictRow);
	return new Set(rows.filter((row) => row.verdict === "dismissed").map((row) => row.changeId));
});
