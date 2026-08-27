import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: the Agent's own declaration that it has nothing left to do. It keeps
// its acquisition; only the mark changes, and repeating the declaration while
// already quiet keeps the moment where it was.
export const makeStandDown = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.standDown")((sessionId: string) =>
		attachments.standDown(sessionId),
	);
