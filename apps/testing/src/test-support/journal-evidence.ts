import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { journalChanges } from "@antumbra/server-journal/postgres/changes/fixture.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { journalExecution } from "@antumbra/server-journal/postgres/execution/fixture.ts";
import { syncExecutionFixture } from "@antumbra/server-journal/postgres/execution/sync-fixture.ts";
import { journalPieces } from "@antumbra/server-journal/postgres/pieces/fixture.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect } from "effect";
import type { journalComparison } from "#test-support/journal-comparison.ts";
import { captureJournal } from "#test-support/journal-replay.ts";

export const observeJournal = Effect.fn("PostgresApp.observeJournal")(function* (
	journal: Effect.Success<ReturnType<typeof journalComparison>>,
	requestId: Request,
) {
	const filename = yield* captureJournal(journal);
	yield* syncExecutionFixture(yield* journalExecution(filename));
	const snapshot = yield* journalPieces(filename);
	const changes = yield* ChangesHistory;
	const recorded = new Set((yield* changes.read()).map((event) => event.requestId));
	for (const event of (yield* journalChanges(filename)).events) {
		if (!recorded.has(event.requestId)) yield* changes.append(event.requestId, [event.value]);
	}
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
