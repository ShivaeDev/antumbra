import { command } from "@antumbra/platform-feature/command.ts";
import { Clock, Effect, Schema } from "effect";
import { messageSent } from "#facts/message-sent.ts";
import { MessageId } from "#ids.ts";
import { MessagePrecedence } from "#rows/message.ts";

const BODY = "body";

const NEEDS_A_BODY = "A message needs a body";

export const send = command("send", {
	input: { toAgentId: Schema.String, authorAgentId: Schema.NullOr(Schema.String), body: Schema.String, precedence: MessagePrecedence },
	reads: [],
	emits: messageSent,
	rejections: { Blank: { field: Schema.String, message: Schema.String } },
	run: Effect.fn("mail.send")(function* (input, _rows, reject) {
		const body = input.body.trim();
		if (body === "") {
			return yield* reject.Blank({ field: BODY, message: NEEDS_A_BODY });
		}
		const at = yield* Clock.currentTimeMillis;
		return {
			authorAgentId: input.authorAgentId,
			body,
			id: MessageId.make(input.requestId),
			precedence: input.precedence,
			sentAt: new Date(at).toISOString(),
			toAgentId: input.toAgentId,
		};
	}),
});
