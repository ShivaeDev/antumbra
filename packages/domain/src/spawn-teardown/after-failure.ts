import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { Effect } from "effect";
import { AgentBirth } from "#agent-birth/service.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const afterFailure = Effect.fn("SpawnTeardown.afterFailure")(function* (payload: SpawnFields) {
	const birth = yield* AgentBirth;
	const resources = yield* ResourceReconciler;
	yield* birth.settleFailure(payload).pipe(
		Effect.tap(() => resources.request()),
		Effect.catchCause((cause) =>
			Effect.logError("spawn failure settlement failed", { agentId: payload.agentId, sessionId: payload.sessionId }, cause),
		),
	);
});
