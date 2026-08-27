import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: when each attached Session said it had nothing left to do. Policy owns
// the threshold; the fabric only remembers the moment.
export const makeIdleSince = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.idleSince")(
		(): Effect.Effect<ReadonlyMap<string, number>> => attachments.idleSince,
	);
