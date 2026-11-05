import { BoardsEvent } from "@antumbra/platform-vocabulary/boards-event.ts";
import { boardEntry, smoothingAttempt, smoothingSession } from "@antumbra/server-storage/boards/rows.ts";
import { BoardsHistory } from "@antumbra/server-storage/boards/service.ts";
import { selection as boardEntrySelection } from "@antumbra/server-storage/records/board-entry.ts";
import { selection as smoothingAttemptSelection } from "@antumbra/server-storage/records/smoothing-attempt.ts";
import { selection as smoothingSessionSelection } from "@antumbra/server-storage/records/smoothing-session.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalBoards = Effect.fn("BoardsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	const events = yield* legacyEvents(BoardsEvent, [
		"NoteWritten",
		"SummaryWritten",
		"PieceSummaryWritten",
		"BoardSmoothingRequested",
		"SmoothingFinished",
		"SmoothingSessionBound",
		"SmoothingSessionFinished",
	]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		boardEntry: yield* legacyRows(boardEntry).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		smoothingAttempt: yield* legacyRows(smoothingAttempt).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		smoothingSession: yield* legacyRows(smoothingSession).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayBoardsFixture = Effect.fn("BoardsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalBoards>>) {
	const history = yield* BoardsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(boardEntry.Row))(
				snapshot.boardEntry,
				yield* rows.boardEntry
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: boardEntrySelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(smoothingAttempt.Row))(
				snapshot.smoothingAttempt,
				yield* rows.smoothingAttempt
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingAttemptSelection })
					.pipe(Effect.orDie),
			) &&
			Schema.toEquivalence(Schema.Array(smoothingSession.Row))(
				snapshot.smoothingSession,
				yield* rows.smoothingSession
					.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: smoothingSessionSelection })
					.pipe(Effect.orDie),
			)
		)
	)
		return yield* Effect.fail(new BoardsFixtureMismatch({ message: "Boards history does not reproduce captured rows" }));
	return { boards: snapshot.events.length, events: snapshot.events.length };
});
export class BoardsFixtureMismatch extends Schema.TaggedError<BoardsFixtureMismatch>()("BoardsFixtureMismatch", { message: Schema.String }) {}
