import type { Operation, OperationResult } from "@antumbra/platform-runner/operations.ts";
import { Deferred, Effect, Exit } from "effect";
import { RunnerLog } from "#log.ts";
import { run } from "#operation.ts";
import { accepted, type State } from "#state.ts";

export const execute = Effect.fn("RunnerFabric.execute")(function* (state: State, operation: Operation) {
	const log = yield* RunnerLog;
	const history = yield* log.request(operation.requestId);
	const done = history.some(
		({ event }) =>
			(operation.type === "Stop" && event.type === "SessionEnded") ||
			(operation.type === "Sleep" && event.type === "SessionSlept") ||
			(operation.type === "Interrupt" && event.type === "SessionInterrupted"),
	);
	if (done) return accepted;
	const existing = state.pending.get(operation.requestId);
	if (existing !== undefined) return yield* Deferred.await(existing);
	const result = yield* Deferred.make<OperationResult>();
	state.pending.set(operation.requestId, result);
	return yield* run(state, operation).pipe(
		Effect.tap((value) => Deferred.succeed(result, value)),
		Effect.onExit((exit) => (Exit.isFailure(exit) ? Deferred.interrupt(result) : Effect.void)),
		Effect.ensuring(Effect.sync(() => state.pending.delete(operation.requestId))),
	);
});
