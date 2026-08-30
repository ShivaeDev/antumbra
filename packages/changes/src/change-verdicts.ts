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

// why: every reader of a dismissal asks the same question — is this change
// settled — so the set of ids is the whole projection. The word itself matters
// only where the verdict is written.
export const readDismissedChangeIds: Effect.Effect<
	ReadonlySet<string>,
	PrismaError | StoredChangeVerdictInvalid,
	Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* Effect.forEach(yield* db.ChangeVerdict.all(), changeVerdictRow);
	return new Set(rows.filter((row) => row.verdict === "dismissed").map((row) => row.changeId));
});
