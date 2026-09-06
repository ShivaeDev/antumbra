import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect, type Ref } from "effect";
import { originOf, type SessionTree } from "#tree/attribution.ts";
import { mintAdmitted } from "#tree/lifecycle/mint-admitted.ts";
import { reopen } from "#tree/lifecycle/reopen.ts";

export const admitNode = Effect.fn("SessionTreeLifecycle.admitNode")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	event: AgentEvent,
) {
	const origin = originOf(event);
	if (origin === undefined || origin.node === undefined) return undefined;
	const durable = yield* reopen(rootSessionId, tree, origin.node, origin.spawnedBy, event);
	return durable ?? (yield* mintAdmitted(rootSessionId, tree, origin.node, origin, event));
});
