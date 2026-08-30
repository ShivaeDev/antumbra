import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: the ids annotate the whole attachment, not just the span the seam
// happens to be standing in, so every span a Session opens beneath it is found
// by the Session it belongs to rather than by reading its parents.
export const makeStop = (attachments: SessionFabricState["attachments"], lifecycles: SessionFabricState["lifecycles"]) =>
	Effect.fn("sessionFabric.stop")((sessionId: string) =>
		lifecycles.stop(sessionId, attachments.stop(sessionId)).pipe(Effect.annotateSpans({ sessionId })),
	);
