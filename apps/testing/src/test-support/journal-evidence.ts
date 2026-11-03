import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { journalPieces } from "@antumbra/server-journal/postgres/pieces/fixture.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect } from "effect";
import type { journalComparison } from "#test-support/journal-comparison.ts";
import { captureJournal } from "#test-support/journal-replay.ts";

export const observeJournal = Effect.fn("PostgresApp.observeJournal")(function* (
	journal: Effect.Success<ReturnType<typeof journalComparison>>,
	requestId: Request,
) {
	const snapshot = yield* journalPieces(yield* captureJournal(journal));
	const pieces = yield* Pieces;
	for (const piece of snapshot.pieces) {
		yield* pieces.observeProgress(Request.make(`${requestId}/${piece.id}`), {
			id: piece.id,
			outcomes: snapshot.outcomes.filter((row) => row.pieceId === piece.id),
			assignments: snapshot.assignments.filter((row) => row.pieceId === piece.id),
			gates: snapshot.gates.filter((row) => row.pieceId === piece.id),
		});
	}
	return snapshot;
});
