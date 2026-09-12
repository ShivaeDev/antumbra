import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Schema } from "effect";
import { addressed } from "#commands/addressed.ts";
import { messageDelivered } from "#facts/message-delivered.ts";
import { MessageId } from "#ids.ts";
import { message } from "#rows/message.ts";

export const markDelivered = command("markDelivered", {
	input: { agentId: Schema.String, ids: Schema.Array(MessageId) },
	reads: [message],
	emits: messageDelivered,
	rejections: { NotAddressed: { id: Schema.String } },
	run: Effect.fn("mail.markDelivered")(function* (input, rows, reject) {
		const scanned = yield* addressed(rows, input.agentId, input.ids);
		if (scanned._tag === "Stray") {
			return yield* reject.NotAddressed({ id: scanned.id });
		}
		const at = yield* Clock.currentTimeMillis;
		const waiting = scanned.held.filter((held) => held.deliveredAt === null);
		return { deliveredAt: new Date(at).toISOString(), ids: waiting.map((held) => held.id) };
	}),
});
