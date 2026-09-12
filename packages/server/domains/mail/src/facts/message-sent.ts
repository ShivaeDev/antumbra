import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { MessageId } from "#ids.ts";
import { MessagePrecedence } from "#rows/message.ts";

export const messageSent = fact("MessageSent", {
	id: MessageId,
	toAgentId: Schema.String,
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	precedence: MessagePrecedence,
	sentAt: Schema.String,
});
