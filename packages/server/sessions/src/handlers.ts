import {
	ForAgent,
	Opening,
	Operations,
	Pending,
	Reading,
	SessionsContract,
	ToolCall,
	TranscriptSources,
	Tree,
} from "@antumbra/server-sessions/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
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
			"sessions.operations": (input) => stream(readKeys(Operations.reads(input)))(service.operations(input).pipe(Effect.orDie)),
			"sessions.opening": (input) => stream(readKeys(Opening.reads(input)))(service.opening(input).pipe(Effect.orDie)),
			"sessions.transcriptSources": (input) => stream(readKeys(TranscriptSources.reads(input)))(service.transcriptSources(input).pipe(Effect.orDie)),
			"sessions.toolCall": (input) => stream(readKeys(ToolCall.reads(input)))(service.toolCall(input).pipe(Effect.orDie)),
			"sessions.reading": (input) => stream(readKeys(Reading.reads(input)))(service.reading(input).pipe(Effect.orDie)),
			"sessions.tree": (input) => stream(readKeys(Tree.reads(input)))(service.tree(input).pipe(Effect.orDie)),
			"sessions.forAgent": (input) => stream(readKeys(ForAgent.reads(input)))(service.forAgent(input).pipe(Effect.orDie)),
			"sessions.pending": (input) => stream(readKeys(Pending.reads(input)))(service.pending(input).pipe(Effect.orDie)),
		});
	}),
);
export const sessions = handlers.pipe(Layer.provideMerge(Sessions.layer));
