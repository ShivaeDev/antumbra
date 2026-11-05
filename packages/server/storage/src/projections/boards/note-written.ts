import type { noteWritten } from "@antumbra/domain-boards/facts/note-written.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const noteWrittenMaterializer = Effect.fn("boards.NoteWritten")(function* (
	fact: FactValue<typeof noteWritten>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.boardEntry
		.insertVoid({
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
		})
		.pipe(Effect.orDie);
});
