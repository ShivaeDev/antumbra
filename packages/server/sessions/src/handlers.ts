import { Effect, Layer } from "effect";
import { SessionsContract } from "#contract.ts";
import { unexpectedCharter, unexpectedRequest, unexpectedRetry, unexpectedStop } from "#failures.ts";
import { Sessions } from "#service.ts";
export const handlers = SessionsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Sessions;
		return SessionsContract.application.of({
			"sessions.request": (input) => service.request(input).pipe(Effect.catchIf(unexpectedRequest, Effect.die)),
			"sessions.retry": (input) => service.retry(input).pipe(Effect.catchIf(unexpectedRetry, Effect.die)),
			"sessions.charter": (input) => service.charter(input).pipe(Effect.catchIf(unexpectedCharter, Effect.die)),
			"sessions.stop": (input) => service.stop(input).pipe(Effect.catchIf(unexpectedStop, Effect.die)),
			"sessions.operations": (input) => service.operations(input).pipe(Effect.orDie),
			"sessions.opening": (input) => service.opening(input).pipe(Effect.orDie),
			"sessions.transcriptSources": (input) => service.transcriptSources(input).pipe(Effect.orDie),
			"sessions.toolCall": (input) => service.toolCall(input).pipe(Effect.orDie),
			"sessions.reading": (input) => service.reading(input).pipe(Effect.orDie),
			"sessions.tree": (input) => service.tree(input).pipe(Effect.orDie),
			"sessions.forAgent": (input) => service.forAgent(input).pipe(Effect.orDie),
			"sessions.pending": (input) => service.pending(input).pipe(Effect.orDie),
		});
	}),
);
export const sessions = handlers.pipe(Layer.provideMerge(Sessions.layer));
