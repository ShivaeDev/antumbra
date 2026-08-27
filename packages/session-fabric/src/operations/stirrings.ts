import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: how many times words have reached a Session. Whoever acts on something
// the Session did takes the count first and hands it back when it commits, so
// an act built on a reading words have overtaken refuses.
export const makeStirrings = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.stirrings")((sessionId: string) =>
		attachments.stirrings(sessionId),
	);
