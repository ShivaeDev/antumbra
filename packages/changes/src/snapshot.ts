import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import { type Context, Effect } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow, PieceChangeRow } from "#change-rows.ts";
import { pieceChangeRow } from "#change-rows.ts";
import type { StoredChangeInvalid, StoredPieceChangeInvalid } from "#errors.ts";

export interface ChangeSnapshot {
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
}

export const readChangeSnapshot: Effect.Effect<
	ChangeSnapshot,
	PrismaError | StoredChangeInvalid | StoredPieceChangeInvalid,
	Context.Service.Identifier<typeof Database> | WriteExecutors
> = Effect.gen(function* () {
	const db = yield* Database;
	// why: Changes own their historical order; consumers receive the decoded
	// aggregate in that order rather than learning how its rows are stored.
	const changes = yield* Effect.forEach(
		yield* db.Change.orderBy((change) => change.createdAt.asc()).all(),
		changeRow,
	);
	const pieceChanges = yield* Effect.forEach(
		yield* db.PieceChange.all(),
		pieceChangeRow,
	);
	return { changes, pieceChanges };
});
