import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeStopIdle = (attachments: SessionFabricState["attachments"], lifecycles: SessionFabricState["lifecycles"]) =>
	Effect.fn("sessionFabric.stopIdle")((sessionId: string) =>
		Effect.flatMap(attachments.idleSince, (idle) =>
			idle.has(sessionId) ? lifecycles.stop(sessionId, attachments.stopIdle(sessionId)) : Effect.succeed(false),
		).pipe(Effect.annotateSpans({ sessionId })),
	);
