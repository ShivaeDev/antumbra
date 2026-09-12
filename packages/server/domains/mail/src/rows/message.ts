import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { MessageId } from "#ids.ts";

export const MessagePrecedence = Schema.Literals(["flash", "priority", "routine"]);
export type MessagePrecedence = typeof MessagePrecedence.Type;

export const message = row(
	"message",
	{
		id: MessageId,
		toAgentId: Schema.String,
		authorAgentId: Schema.NullOr(Schema.String),
		body: Schema.String,
		precedence: MessagePrecedence,
		sentAt: Schema.String,
		deliveredAt: Schema.NullOr(Schema.String),
		readAt: Schema.NullOr(Schema.String),
	},
	{ key: "id", scope: "toAgentId" },
);
