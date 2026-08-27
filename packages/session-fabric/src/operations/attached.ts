import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: every Session with a live acquisition right now. A reader asks this
// rather than the database because whether words can be handed over is a fact
// about this process, and the row cannot know it.
export const makeAttached = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.attached")(
		(): Effect.Effect<ReadonlySet<string>> => attachments.attached,
	);
