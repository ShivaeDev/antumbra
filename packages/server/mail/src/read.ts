import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { Effect } from "effect";

export const mailbox = Effect.fn("Mail.mailbox")(function* (input: { readonly agentId: string }) {
	const history = yield* MailHistory;
	return (yield* history.all()).filter((row) => row.toAgentId === input.agentId);
});
export const unread = Effect.fn("Mail.unread")(function* (input: { readonly agentId: string }) {
	return (yield* mailbox(input)).filter((row) => row.readAt === null);
});
