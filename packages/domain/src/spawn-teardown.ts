import { IntentExecution } from "@antumbra/kernel";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { Cause, Effect } from "effect";
import { AgentBirth } from "#agent-birth/service.ts";
import { makeIsSpawnCancelling } from "#spawn-cancellation.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSpawnTeardown = Effect.gen(function* () {
	const isCancelling = yield* makeIsSpawnCancelling;
	const birth = yield* AgentBirth;
	const resources = yield* ResourceReconciler;
	// Teardown cannot propagate settlement failure; log the stranded birth for boot reconciliation.
	const settleAfterFailure = (payload: SpawnFields) =>
		birth.settleFailure(payload).pipe(
			Effect.tap(() => resources.request()),
			Effect.catchCause((cause) =>
				Effect.logError("spawn failure settlement failed", { agentId: payload.agentId, sessionId: payload.sessionId }, cause),
			),
		);
	const settleCancellation = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const execution = yield* IntentExecution;
			if (yield* isCancelling(execution.intentId)) {
				yield* settleAfterFailure(payload);
			}
		});
	const settleUnlessTeardown = (payload: SpawnFields) => (cause: Cause.Cause<unknown>) =>
		Effect.gen(function* () {
			if (!Cause.hasInterruptsOnly(cause)) {
				yield* settleAfterFailure(payload);
				return;
			}
			yield* settleCancellation(payload);
		});
	const failAfterSettlement = <E>(payload: SpawnFields, error: E) => settleAfterFailure(payload).pipe(Effect.andThen(Effect.fail(error)));
	return {
		failAfterSettlement,
		settleCancellation,
		settleUnlessTeardown,
	};
});
