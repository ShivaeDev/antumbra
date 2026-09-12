import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { messageDelivered } from "#facts/message-delivered.ts";
import { message } from "#rows/message.ts";

export const messageDeliveredMaterializer = materializer(messageDelivered, {
	writes: [message],
	run: Effect.fn("mail.MessageDelivered")(function* (fact, rows) {
		for (const id of fact.ids) {
			yield* rows.message.update(id, { deliveredAt: fact.deliveredAt });
		}
	}),
});
