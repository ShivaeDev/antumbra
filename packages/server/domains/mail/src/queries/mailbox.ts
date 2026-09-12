import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { message } from "#rows/message.ts";

export const mailbox = query("mailbox", {
	input: { agentId: Schema.String },
	output: Schema.Array(message.Row),
	reads: [message],
	scope: (input) => input.agentId,
	run: Effect.fn("mail.mailbox")(function* (input, rows) {
		const stored = yield* rows.message.where({ toAgentId: input.agentId });
		return stored.toSorted((left, right) => left.sentAt.localeCompare(right.sentAt));
	}),
});
