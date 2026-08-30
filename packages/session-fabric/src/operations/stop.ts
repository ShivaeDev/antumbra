import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeStop = (attachments: SessionFabricState["attachments"], lifecycles: SessionFabricState["lifecycles"]) =>
	Effect.fn("sessionFabric.stop")((sessionId: string) =>
		lifecycles.stop(sessionId, attachments.stop(sessionId)).pipe(Effect.annotateSpans({ sessionId })),
	);
