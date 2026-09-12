import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { messageRead } from "#facts/message-read.ts";
import { message } from "#rows/message.ts";

export const messageReadMaterializer = materializer(messageRead, {
	writes: [message],
	run: Effect.fn("mail.MessageRead")(function* (fact, rows) {
		for (const id of fact.ids) {
			yield* rows.message.update(id, { readAt: fact.readAt });
		}
	}),
});
