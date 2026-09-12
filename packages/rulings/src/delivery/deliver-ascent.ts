import { Mail } from "@antumbra/boards";
import { Effect } from "effect";
import { rulingAscentMail } from "#delivery/question-mail.ts";
import type { Ruling } from "#model.ts";

export const deliverAscent = Effect.fn("RulingDelivery.deliverAscent")(function* (ruling: Ruling, toAgentId: string) {
	const mail = yield* Mail;
	const requester = ruling.requester;
	if (requester.kind !== "agent" || requester.agentId === toAgentId) {
		return;
	}
	yield* mail.send({
		authorAgentId: null,
		body: rulingAscentMail(ruling, requester.agentId),
		precedence: "priority",
		requestId: `ruling-ascent:${ruling.id}:${toAgentId}`,
		toAgentId,
	});
});
