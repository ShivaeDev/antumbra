import { Boards } from "@antumbra/boards";
import { Effect, Option } from "effect";
import { rulingAscentMail } from "#delivery/question-mail.ts";
import type { Ruling } from "#model.ts";

// Mail deduplicates sourceRef per mailbox, so each pass may resend to the current rung holder.
export const deliverAscent = Effect.fn("RulingDelivery.deliverAscent")(function* (ruling: Ruling, toAgentId: string) {
	const boards = yield* Boards;
	const requester = ruling.requester;
	if (requester.kind !== "agent" || requester.agentId === toAgentId) {
		return;
	}
	yield* boards.mail({
		authorAgentId: Option.none(),
		body: rulingAscentMail(ruling, requester.agentId),
		precedence: "priority",
		sourceRef: `ruling-ascent:${ruling.id}`,
		toAgentId,
	});
});
