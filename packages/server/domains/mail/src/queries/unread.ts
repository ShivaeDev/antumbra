import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { message } from "#rows/message.ts";

export const unread = query("unread", {
	input: { agentId: Schema.String },
	output: Schema.Array(message.Row),
	reads: [message],
	scope: (input) => input.agentId,
	run: Effect.fn("mail.unread")(function* (input, rows) {
		const stored = yield* rows.message.where({ toAgentId: input.agentId });
		const waiting = stored.filter((held) => held.readAt === null);
		return waiting.toSorted((left, right) => left.sentAt.localeCompare(right.sentAt));
	}),
});
