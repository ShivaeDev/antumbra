import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, type Ref } from "effect";
import type { SessionTree, TreeNode } from "#tree/attribution.ts";
import { adopt } from "#tree/lifecycle/adopt.ts";
import { settle } from "#tree/lifecycle/settle.ts";
import { SessionTreeRows } from "#tree/rows/service.ts";

type SubsessionOpened = Extract<AgentEvent, { type: "subsession.opened" }>;

export const announce = Effect.fn("SessionTreeLifecycle.announce")(function* (
	rootSessionId: string,
	tree: Ref.Ref<SessionTree>,
	known: TreeNode,
	opened: SubsessionOpened,
) {
	if (known.announced) {
		if (opened.label !== undefined) {
			const rows = yield* SessionTreeRows;
			yield* rows.nameNode(known.sessionId, opened.label);
		}
		return true;
	}
	const adopted = yield* adopt(rootSessionId, tree, known, opened);
	return yield* settle(known, opened, adopted);
});
