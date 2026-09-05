import { Clock, Effect, Ref, Result } from "effect";
import type { IntentDemandHealth } from "#health-reading.ts";
import type { IntentDemandRegistration } from "#registration.ts";

export const runRegistration = Effect.fn("IntentDemand.runRegistration")(function* <R>(
	health: Ref.Ref<ReadonlyMap<string, IntentDemandHealth>>,
	registration: IntentDemandRegistration<R>,
) {
	const result = yield* Effect.result(registration.pass);
	const now = yield* Clock.currentTimeMillis;
	const value: IntentDemandHealth = Result.isFailure(result)
		? { failedAtMillis: now, failure: result.failure, state: "degraded" }
		: { checkedAtMillis: now, state: "healthy" };
	yield* Ref.update(health, (current) => new Map(current).set(registration.tag, value));
	if (Result.isFailure(result)) {
		yield* Effect.logWarning("intent demand pass degraded", {
			detail: result.failure.detail,
			tag: registration.tag,
		});
	}
});
