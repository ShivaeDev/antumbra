import type { Operation } from "@antumbra/platform-runner/operations.ts";
import { Effect } from "effect";
import { activity, settled } from "#activity.ts";
import { audit } from "#audit.ts";
import { close } from "#close.ts";
import { deliver } from "#deliver.ts";
import { RunnerLog } from "#log.ts";
import { open } from "#open.ts";
import { accepted, refusal, type State } from "#state.ts";

export const run = Effect.fn("RunnerFabric.operation")(function* (state: State, operation: Operation) {
	const log = yield* RunnerLog;
	switch (operation.type) {
		case "Start":
		case "Wake":
			return yield* open(state, operation);
		case "Audit":
			yield* audit(
				state.attachments.get(operation.sessionId),
				{ sessionId: operation.sessionId, options: operation },
				operation.rootRef,
				operation.nodeRef,
			);
			return accepted;
		case "Deliver":
			return yield* deliver(state, operation.requestId, operation.sessionId, operation.input, operation.act);
		case "Interrupt": {
			const handle = state.attachments.get(operation.sessionId)?.handle;
			return handle === undefined
				? refusal("session is not attached")
				: yield* handle.interrupt.pipe(
						Effect.andThen(log.append({ type: "SessionInterrupted", requestId: operation.requestId, sessionId: operation.sessionId })),
						Effect.as(accepted),
						Effect.catchTag("BackendFailure", (error) => Effect.succeed(refusal(error.detail))),
					);
		}
		case "Sleep":
			if (!settled(state.attachments.get(operation.sessionId)?.activity ?? activity())) return refusal("session still has active work");
			yield* close(state, operation.sessionId);
			yield* log.append({ type: "SessionSlept", requestId: operation.requestId, sessionId: operation.sessionId });
			return accepted;
		case "Stop":
			yield* close(state, operation.sessionId);
			yield* log.append({ type: "SessionEnded", requestId: operation.requestId, sessionId: operation.sessionId, reason: operation.reason });
			return accepted;
		case "Drain":
			return yield* state.admission.close.pipe(
				Effect.andThen(
					Effect.gen(function* () {
						for (const sessionId of state.attachments.keys()) {
							yield* close(state, sessionId);
							yield* log.append({ type: "SessionSlept", requestId: operation.requestId, sessionId });
						}
						return accepted;
					}),
				),
				Effect.ensuring(state.admission.reopen),
			);
		default:
			return refusal("operation is not a session operation");
	}
});
