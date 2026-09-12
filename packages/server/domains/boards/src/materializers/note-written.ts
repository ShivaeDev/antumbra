import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { noteWritten } from "#facts/note-written.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const noteWrittenMaterializer = materializer(noteWritten, {
	writes: [boardEntry],
	run: Effect.fn("boards.NoteWritten")(function* (fact, rows) {
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
	}),
});
