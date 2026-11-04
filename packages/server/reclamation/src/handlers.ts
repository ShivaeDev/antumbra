import { Effect, Layer } from "effect";
import { ReclamationContract } from "#contract.ts";
import { unexpectedClaim, unexpectedFailed, unexpectedHeld, unexpectedPlan, unexpectedReady, unexpectedReclaimed } from "#failures.ts";
import { Reclamation } from "#service.ts";
export const handlers = ReclamationContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Reclamation;
		return ReclamationContract.application.of({
			"reclamation.plan": (input) => service.plan(input).pipe(Effect.catchIf(unexpectedPlan, Effect.die)),
			"reclamation.ready": (input) => service.ready(input).pipe(Effect.catchIf(unexpectedReady, Effect.die)),
			"reclamation.claim": (input) => service.claim(input).pipe(Effect.catchIf(unexpectedClaim, Effect.die)),
			"reclamation.reclaimed": (input) => service.reclaimed(input).pipe(Effect.catchIf(unexpectedReclaimed, Effect.die)),
			"reclamation.held": (input) => service.held(input).pipe(Effect.catchIf(unexpectedHeld, Effect.die)),
			"reclamation.failed": (input) => service.failed(input).pipe(Effect.catchIf(unexpectedFailed, Effect.die)),
			"reclamation.berths": (input) => service.berths(input).pipe(Effect.orDie),
			"reclamation.current": (input) => service.current(input).pipe(Effect.orDie),
			"reclamation.candidates": (input) => service.candidates(input).pipe(Effect.orDie),
			"reclamation.claims": (input) => service.claims(input).pipe(Effect.orDie),
			"reclamation.retryable": (input) => service.retryable(input).pipe(Effect.orDie),
		});
	}),
);
export const reclamation = handlers.pipe(Layer.provideMerge(Reclamation.layer));
