import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { messageSent } from "#facts/message-sent.ts";
import { message } from "#rows/message.ts";

export const messageSentMaterializer = materializer(messageSent, {
	writes: [message],
	run: Effect.fn("mail.MessageSent")(function* (fact, rows) {
		yield* rows.message.insert({
			authorAgentId: fact.authorAgentId,
			body: fact.body,
			deliveredAt: null,
			id: fact.id,
			precedence: fact.precedence,
			readAt: null,
			sentAt: fact.sentAt,
			toAgentId: fact.toAgentId,
		});
	}),
});
