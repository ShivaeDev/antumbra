import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: a turn ending leaves the same quiet mark as standing down. It refuses
// when words have reached the Session since the count was taken, so an ending
// overtaken by the next turn cannot put it to rest.
export const makeTurnEnded = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.turnEnded")((sessionId: string, stirrings: number) =>
		attachments.turnEnded(sessionId, stirrings),
	);
