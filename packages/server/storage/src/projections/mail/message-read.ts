import type { messageRead } from "@antumbra/domain-mail/facts/message-read.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const messageReadMaterializer = Effect.fn("mail.MessageRead")(function* (
	fact: FactValue<typeof messageRead>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	for (const id of fact.ids) {
		yield* rows.message.updateVoid({ ...{ readAt: fact.readAt }, id: id }).pipe(Effect.orDie);
	}
});
