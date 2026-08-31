import { Database, type PrismaError } from "@antumbra/persistence";
import { type Context, Effect } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { readDismissedChangeIds } from "#change-verdicts.ts";
import type { StoredChangeInvalid, StoredChangeVerdictInvalid, StoredPieceChangeInvalid } from "#errors.ts";

export interface ChangeSnapshot {
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
}

export const readChangeSnapshot: Effect.Effect<
	ChangeSnapshot,
	PrismaError | StoredChangeInvalid | StoredChangeVerdictInvalid | StoredPieceChangeInvalid,
	Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const db = yield* Database;
	const changes = yield* Effect.forEach(yield* db.Change.orderBy((change) => change.createdAt.asc()).all(), changeRow);
	const pieceChanges = yield* Effect.forEach(yield* db.PieceChange.all(), pieceChangeRow);
	return {
		changes,
		dismissedChangeIds: yield* readDismissedChangeIds,
		pieceChanges,
	};
});
