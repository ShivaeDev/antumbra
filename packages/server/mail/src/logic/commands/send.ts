import type * as Source from "@antumbra/domain-mail/commands/send.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import { Clock, Effect } from "effect";

const BODY = "body";

const NEEDS_A_BODY = "A message needs a body";

export const send = Effect.fn("mail.send")(function* (
	input: typeof Source.send.Input.Type,
	reject: typeof Source.send.reject,
): Effect.fn.Return<typeof Source.send.emits.Payload.Type, RejectedBy<typeof Source.send.rejections>> {
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
});
