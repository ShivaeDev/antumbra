import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { message } from "#rows/message.ts";

export const mailbox = query("mailbox", {
	input: { agentId: Schema.String },
	output: Schema.Array(message.Row),
	reads: [message],
	scope: (input) => input.agentId,
});
