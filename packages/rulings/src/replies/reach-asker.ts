import { Boards } from "@antumbra/boards";
import { Effect, Option } from "effect";
import { RulingHolds } from "#holds/service.ts";
import type { Ruling } from "#model.ts";

export const reachAsker = Effect.fn("RulingReplies.reachAsker")(function* (ruling: Ruling, sourceRef: string, body: string) {
	const boards = yield* Boards;
	const holds = yield* RulingHolds;
	const requester = ruling.requester;
	if (requester.kind !== "agent" || (yield* holds.isHeld(ruling.id))) {
		return;
	}
	yield* boards.mail({ authorAgentId: Option.none(), body, precedence: "priority", sourceRef, toAgentId: requester.agentId });
});
