import { Schema } from "effect";
import * as Id from "#id.ts";

export const MessageId = Id.brand("MessageId");
export type MessageId = typeof MessageId.Type;
export const MessagePrecedence = Schema.Literals(["flash", "priority", "routine"]);
export type MessagePrecedence = typeof MessagePrecedence.Type;
export const MessageSent = Schema.Struct({
	id: MessageId,
	toAgentId: Schema.String,
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	precedence: MessagePrecedence,
	sentAt: Schema.String,
});
export const MessageDelivered = Schema.Struct({ ids: Schema.Array(MessageId), deliveredAt: Schema.String });
export const MessageRead = Schema.Struct({ ids: Schema.Array(MessageId), readAt: Schema.String });
export const Message = Schema.Struct({
	...MessageSent.fields,
	deliveredAt: Schema.NullOr(Schema.String),
	readAt: Schema.NullOr(Schema.String),
});

export const ROUTINE_MAIL_MINUTES = 5;
