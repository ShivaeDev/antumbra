import { Effect } from "effect";
import { acquire } from "#acquire.ts";
import { deliver } from "#deliver.ts";
import { RunnerLog } from "#log.ts";
import { accepted, type Opening, refusal, type State } from "#state.ts";

const admitted = Effect.fn("RunnerFabric.open")(function* (state: State, operation: Opening) {
	const log = yield* RunnerLog;
	const { requestId, sessionId } = operation;
	const evidence = yield* log.request(requestId);
	const failed = evidence.find(({ event }) => event.type === "SessionFailed");
	if (failed?.event.type === "SessionFailed") return refusal(failed.event.reason);
	const opened = evidence.some(({ event }) => event.type === "SessionStarted" || event.type === "SessionWoke");
	if (opened && !state.attachments.has(sessionId)) return accepted;
	if (!state.attachments.has(sessionId)) {
		const result = yield* acquire(state, operation);
		if (result.type === "Refused") return result;
	}
	return yield* deliver(state, requestId, sessionId, operation.type === "Start" ? operation.charter : operation.instruction, "queue");
});

export const open = (state: State, operation: Opening) => state.admission.run(admitted(state, operation));
