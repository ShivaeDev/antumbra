import type { ToolCall } from "@antumbra/platform-runner/tools.ts";
import { Deferred, Effect } from "effect";
import { RunnerLog } from "#log.ts";
import { ServerTools } from "#ports.ts";
import type { State } from "#state.ts";

export const tool = Effect.fn("RunnerFabric.tool")(function* (state: State, call: ToolCall) {
	const log = yield* RunnerLog;
	const server = yield* ServerTools;
	const entry = state.attachments.get(call.sessionId);
	if (entry === undefined) return yield* Effect.interrupt;
	yield* Deferred.await(entry.opened).pipe(Effect.orDie);
	entry.activity.tools.add(call.callId);
	return yield* Effect.gen(function* () {
		const previous = yield* log.tool(call.sessionId, call.callId);
		const answered = previous.find(({ event }) => event.type === "ToolAnswered");
		if (answered?.event.type === "ToolAnswered") return answered.event.answer;
		if (previous.length === 0) yield* log.append({ type: "ToolCalled", ...call });
		const answer = yield* server.call(call);
		yield* log.append({ type: "ToolAnswered", sessionId: call.sessionId, callId: call.callId, answer });
		return answer;
	}).pipe(Effect.ensuring(Effect.sync(() => entry.activity.tools.delete(call.callId))));
});
