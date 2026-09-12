import { Schema } from "effect";
import { MessagePrecedence, type message } from "#rows/message.ts";

export const MailBatch = Schema.Struct({ count: Schema.Number, precedence: MessagePrecedence });
export type MailBatch = typeof MailBatch.Type;
const URGENCY: Record<MessagePrecedence, number> = { flash: 2, priority: 1, routine: 0 };

export const dueMail = (unread: ReadonlyArray<typeof message.Row.Type>, nowMillis: number, quietMillis: number): MailBatch | undefined => {
	const due = unread.some(
		(held) => held.deliveredAt === null && (held.precedence !== "routine" || nowMillis - Date.parse(held.sentAt) >= quietMillis),
	);
	if (!due) return undefined;
	const precedence = unread.reduce<MessagePrecedence>(
		(highest, held) => (URGENCY[held.precedence] > URGENCY[highest] ? held.precedence : highest),
		"routine",
	);
	return { count: unread.length, precedence };
};
