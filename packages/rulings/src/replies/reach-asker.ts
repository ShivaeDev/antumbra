import { Mail } from "@antumbra/boards";
import { Effect } from "effect";
import { RulingHolds } from "#holds/service.ts";
import type { Ruling } from "#model.ts";

export const reachAsker = Effect.fn("RulingReplies.reachAsker")(function* (ruling: Ruling, requestId: string, body: string) {
	const mail = yield* Mail;
	const holds = yield* RulingHolds;
	const requester = ruling.requester;
	if (requester.kind !== "agent" || (yield* holds.isHeld(ruling.id))) {
		return;
	}
	yield* mail.send({ authorAgentId: null, body, precedence: "priority", requestId, toAgentId: requester.agentId });
});
