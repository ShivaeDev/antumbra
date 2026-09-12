import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { Effect, Schema } from "effect";
import { BODY, NEEDS_BODY, nextSequence, owned, standing } from "#commands/board.ts";
import { noteWritten } from "#facts/note-written.ts";
import { BoardEntryId, BoardId } from "#ids.ts";

export const write = command("write", {
	input: {
		board: BoardId,
		register: titled(Schema.Literals(["smooth", "rough"]), { title: "Register" }),
		body: titled(Schema.String, { multiline: true, title: "Entry" }),
		author: Schema.NullOr(Schema.String),
	},
	reads: owned,
	emits: noteWritten,
	rejections: {
		Blank: { field: Schema.String, message: Schema.String },
		UnknownBoard: { board: Schema.String },
	},
	run: Effect.fn("boards.write")(function* (input, rows, reject) {
		const body = input.body.trim();
		if (body === "") {
			return yield* reject.Blank({ field: BODY, message: NEEDS_BODY });
		}
		if (!(yield* standing(rows, input.board))) {
			return yield* reject.UnknownBoard({ board: input.board });
		}
		return {
			authorAgentId: input.author,
			board: input.board,
			body,
			id: BoardEntryId.make(input.requestId),
			number: yield* nextSequence(rows, input.board),
			register: input.register,
		};
	}),
});
