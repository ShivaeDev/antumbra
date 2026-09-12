import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Schema } from "effect";
import { addressed } from "#commands/addressed.ts";
import { messageRead } from "#facts/message-read.ts";
import { MessageId } from "#ids.ts";
import { message } from "#rows/message.ts";

export const markRead = command("markRead", {
	input: { agentId: Schema.String, ids: Schema.Array(MessageId) },
	reads: [message],
	emits: messageRead,
	rejections: { NotAddressed: { id: Schema.String } },
	run: Effect.fn("mail.markRead")(function* (input, rows, reject) {
		const scanned = yield* addressed(rows, input.agentId, input.ids);
		if (scanned._tag === "Stray") {
			return yield* reject.NotAddressed({ id: scanned.id });
		}
		const at = yield* Clock.currentTimeMillis;
		const waiting = scanned.held.filter((held) => held.readAt === null);
		return { ids: waiting.map((held) => held.id), readAt: new Date(at).toISOString() };
	}),
});
