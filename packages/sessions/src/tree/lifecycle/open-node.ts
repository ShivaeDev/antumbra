import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect, Ref } from "effect";
import type { SessionTree } from "#tree/attribution.ts";
import { announce } from "#tree/lifecycle/announce.ts";
import { mintOpened } from "#tree/lifecycle/mint-opened.ts";
import { reopen } from "#tree/lifecycle/reopen.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;

export const openNode = Effect.fn("SessionTreeLifecycle.openNode")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	opened: SubsessionOpened,
) {
	const known = (yield* Ref.get(tree)).nodes.get(opened.subsessionRef);
	if (known !== undefined) {
		return yield* announce(rootSessionId, tree, known, opened);
	}
	const durable = yield* reopen(rootSessionId, tree, opened.subsessionRef, opened.spawnedBy, opened);
	return durable === undefined ? yield* mintOpened(rootSessionId, tree, opened) : yield* announce(rootSessionId, tree, durable, opened);
});
