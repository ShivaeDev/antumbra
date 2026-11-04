import type { BoardsEvent } from "@antumbra/platform-vocabulary/boards-event.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#postgres/boards/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("BoardsHistory.apply")(function* ({ value, requestId, streamVersion }: Event<typeof BoardsEvent.Type>) {
		switch (value._tag) {
			case "NoteWritten": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.boardEntry.insert({
					authorAgentId: fact.authorAgentId,
					board: fact.board,
					body: fact.body,
					coversFrom: null,
					coversTo: null,
					createdAt: new Date(fact.at).toISOString(),
					id: fact.id,
					kind: "note",
					level: null,
					pieceId: null,
					register: fact.register,
					seq: fact.number,
				});
				break;
			}
			case "SummaryWritten": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.boardEntry.insert({
					authorAgentId: fact.authorAgentId,
					board: fact.board,
					body: fact.body,
					coversFrom: fact.coversFrom,
					coversTo: fact.coversTo,
					createdAt: new Date(fact.at).toISOString(),
					id: fact.id,
					kind: "summary",
					level: fact.level,
					pieceId: null,
					register: "smooth",
					seq: fact.number,
				});
				break;
			}
			case "PieceSummaryWritten": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.boardEntry.insert({
					authorAgentId: fact.authorAgentId,
					board: fact.board,
					body: fact.body,
					coversFrom: null,
					coversTo: null,
					createdAt: new Date(fact.at).toISOString(),
					id: fact.id,
					kind: "pieceSummary",
					level: null,
					pieceId: fact.pieceId,
					register: "rough",
					seq: fact.number,
				});
				break;
			}
			case "BoardSmoothingRequested": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.smoothingAttempt.insert({
					id: fact.id,
					voyageId: fact.voyageId,
					pieceId: fact.pieceId,
					throughToday: fact.throughToday,
					requestedAt: fact.requestedAt,
					by: fact.by,
					status: "requested",
					detail: null,
				});
				break;
			}
			case "SmoothingFinished": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.smoothingAttempt.update(fact.id, { status: fact.status, detail: fact.detail });
				break;
			}
			case "SmoothingSessionBound": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.smoothingSession.insert({
					sessionId: fact.sessionId,
					attemptId: fact.attemptId,
					agentId: fact.agentId,
					board: fact.board,
					pieceId: fact.pieceId,
					title: fact.title,
					level: fact.level,
					coversFrom: fact.coversFrom,
					coversTo: fact.coversTo,
					status: "waiting",
				});
				break;
			}
			case "SmoothingSessionFinished": {
				const fact = { ...value, requestId: Request.make(requestId), seq: streamVersion };

				yield* rows.smoothingSession.update(fact.sessionId, { status: fact.status });
				break;
			}
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."boardEntry"`;
	yield* sql`delete from antumbra."smoothingAttempt"`;
	yield* sql`delete from antumbra."smoothingSession"`;
	yield* invalidateOnCommit(["boardEntry", "smoothingAttempt", "smoothingSession"]);
});
