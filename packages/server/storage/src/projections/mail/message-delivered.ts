import type { messageDelivered } from "@antumbra/domain-mail/facts/message-delivered.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const messageDeliveredMaterializer = Effect.fn("mail.MessageDelivered")(function* (
	fact: FactValue<typeof messageDelivered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	for (const id of fact.ids) {
		yield* rows.message.updateVoid({ ...{ deliveredAt: fact.deliveredAt }, id: id }).pipe(Effect.orDie);
	}
});
