import type { Message, MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { Effect } from "effect";

export const addressed = Effect.fn("Mail.addressed")(function* (agentId: string, ids: readonly MessageId[]) {
	const history = yield* MailHistory;
	const held: (typeof Message.Type)[] = [];
	for (const id of ids) {
		if (held.some((row) => row.id === id)) continue;
		const row = yield* history.byId(id);
		if (row === null || row.toAgentId !== agentId) return { _tag: "Stray", id } as const;
		held.push(row);
	}
	return { _tag: "Addressed", held } as const;
});
