import type { messageSent } from "@antumbra/domain-mail/facts/message-sent.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const messageSentMaterializer = Effect.fn("mail.MessageSent")(function* (
	fact: FactValue<typeof messageSent>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.message
		.insertVoid({
			authorAgentId: fact.authorAgentId,
			body: fact.body,
			deliveredAt: null,
			id: fact.id,
			precedence: fact.precedence,
			readAt: null,
			sentAt: fact.sentAt,
			toAgentId: fact.toAgentId,
		})
		.pipe(Effect.orDie);
});
