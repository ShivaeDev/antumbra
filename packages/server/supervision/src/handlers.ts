import { Effect, Layer } from "effect";
import { SupervisionContract } from "#contract.ts";
import { unexpectedFailLoop, unexpectedForgetLoop, unexpectedResumeLoop } from "#failures.ts";
import { Supervision } from "#service.ts";
export const handlers = SupervisionContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Supervision;
		return SupervisionContract.application.of({
			"supervision.failLoop": (input) => service.failLoop(input).pipe(Effect.catchIf(unexpectedFailLoop, Effect.die)),
			"supervision.forgetLoop": (input) => service.forgetLoop(input).pipe(Effect.catchIf(unexpectedForgetLoop, Effect.die)),
			"supervision.resumeLoop": (input) => service.resumeLoop(input).pipe(Effect.catchIf(unexpectedResumeLoop, Effect.die)),
			"supervision.stoppedLoops": (input) => service.stoppedLoops(input).pipe(Effect.orDie),
		});
	}),
);
export const supervision = handlers.pipe(Layer.provideMerge(Supervision.layer));
