import { command } from "@antumbra/platform-feature/command.ts";
import { MessagePrecedence } from "@antumbra/platform-vocabulary/mail.ts";
import { Schema } from "effect";
import { messageSent } from "#facts/message-sent.ts";

export const send = command("send", {
	input: { toAgentId: Schema.String, authorAgentId: Schema.NullOr(Schema.String), body: Schema.String, precedence: MessagePrecedence },
	reads: [],
	emits: messageSent,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
});
