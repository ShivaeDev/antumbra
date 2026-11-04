import { BoardsEvent } from "@antumbra/platform-vocabulary/boards-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { boardEntry, smoothingAttempt, smoothingSession } from "#postgres/boards/rows.ts";
import { BoardsHistory } from "#postgres/boards/service.ts";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
export const journalBoards = Effect.fn("BoardsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
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
	yield* history.rebuild();
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(boardEntry.Row))(snapshot.boardEntry, yield* rows.boardEntry.where({})) &&
			Schema.toEquivalence(Schema.Array(smoothingAttempt.Row))(snapshot.smoothingAttempt, yield* rows.smoothingAttempt.where({})) &&
			Schema.toEquivalence(Schema.Array(smoothingSession.Row))(snapshot.smoothingSession, yield* rows.smoothingSession.where({}))
		)
	)
		return yield* Effect.fail(new BoardsFixtureMismatch({ message: "Boards history does not reproduce captured rows" }));
	return { boards: snapshot.events.length, events: snapshot.events.length };
});
export class BoardsFixtureMismatch extends Schema.TaggedError<BoardsFixtureMismatch>()("BoardsFixtureMismatch", { message: Schema.String }) {}
