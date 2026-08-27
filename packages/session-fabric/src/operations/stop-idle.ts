import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: the mark is read before the lifecycle is entered so a Session that is
// plainly working never raises its stop signal, and read again under the claim
// so the answer cannot go stale between the two.
export const makeStopIdle = (
	attachments: SessionFabricState["attachments"],
	lifecycles: SessionFabricState["lifecycles"],
) =>
	Effect.fn("sessionFabric.stopIdle")((sessionId: string) =>
		Effect.flatMap(attachments.idleSince, (idle) =>
			idle.has(sessionId)
				? lifecycles.stop(sessionId, attachments.stopIdle(sessionId))
				: Effect.succeed(false),
		).pipe(Effect.annotateSpans({ sessionId })),
	);
