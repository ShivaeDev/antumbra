import type { Input } from "@antumbra/platform-runner/input.ts";
import { Effect, Fiber } from "effect";
import { RunnerLog } from "#log.ts";
import { InputResolver } from "#ports.ts";
import { accepted, refusal, type State } from "#state.ts";

export const deliver = Effect.fn("RunnerFabric.deliver")(function* (
	state: State,
	requestId: string,
	sessionId: string,
	input: Input,
	act: "queue" | "steer",
) {
	const log = yield* RunnerLog;
	const resolver = yield* InputResolver;
	const entry = state.attachments.get(sessionId);
	if (entry?.handle === undefined)
		return yield* log
			.append({ type: "InputFailed", requestId, sessionId, inputId: input.id, reason: "session is not attached" })
			.pipe(Effect.as(refusal("session is not attached")));
	const evidence = yield* log.request(requestId);
	const failed = evidence.find(({ event }) => (event.type === "InputFailed" || event.type === "InputAmbiguous") && event.inputId === input.id);
	if (failed?.event.type === "InputFailed" || failed?.event.type === "InputAmbiguous") return refusal(failed.event.reason);
	const delivered = evidence.some(({ event }) => event.type === "InputAccepted" && event.inputId === input.id);
	if (delivered) return accepted;
	const resolved = yield* resolver.resolve(input);
	entry.activity.working = true;
	return yield* entry.handle[act](resolved).pipe(
		Effect.forkIn(entry.scope),
		Effect.flatMap(Fiber.join),
		Effect.andThen(log.append({ type: "InputAccepted", requestId, sessionId, inputId: input.id })),
		Effect.as(accepted),
		Effect.onInterrupt(() =>
			log.append({ type: "InputAmbiguous", requestId, sessionId, inputId: input.id, reason: "session stopped during delivery" }),
		),
		Effect.catchTag("BackendFailure", (error) =>
			log.append({ type: "InputAmbiguous", requestId, sessionId, inputId: input.id, reason: error.detail }).pipe(Effect.as(refusal(error.detail))),
		),
	);
});
