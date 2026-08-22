import { IntentExecution } from "@antumbra/kernel";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { Cause, Effect } from "effect";
import { makeIsSpawnCancelling } from "#spawn-cancellation.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import { spawnResolution } from "#spawn-resolution.ts";

export const makeSpawnTeardown = Effect.gen(function* () {
	const isCancelling = yield* makeIsSpawnCancelling;
	const resolution = yield* spawnResolution;
	const resources = yield* ResourceReconciler;
	// why: settlement runs from teardown handlers, whose contract cannot carry
	// a failure onward, so this is the last reader the refusal will ever have.
	// It is recorded as an error rather than a warning because what it names
	// is an Agent left spawning — work nothing will hand back on its own, and
	// nothing short of the next boot's reconcile will release.
	const settleAfterFailure = (payload: SpawnFields) =>
		resolution.settleFailure(payload).pipe(
			Effect.tap(() => resources.request),
			Effect.catchCause((cause) =>
				Effect.logError(
					"spawn failure settlement failed",
					{ agentId: payload.agentId, sessionId: payload.sessionId },
					cause,
				),
			),
		);
	const settleCancellation = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const execution = yield* IntentExecution;
			if (yield* isCancelling(execution.intentId)) {
				yield* settleAfterFailure(payload);
			}
		});
	const settleUnlessTeardown =
		(payload: SpawnFields) => (cause: Cause.Cause<unknown>) =>
			Effect.gen(function* () {
				if (!Cause.hasInterruptsOnly(cause)) {
					yield* settleAfterFailure(payload);
					return;
				}
				yield* settleCancellation(payload);
			});
	const failAfterSettlement = <E>(payload: SpawnFields, error: E) =>
		settleAfterFailure(payload).pipe(Effect.andThen(Effect.fail(error)));
	return {
		failAfterSettlement,
		settleCancellation,
		settleUnlessTeardown,
	};
});
