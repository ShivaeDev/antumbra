import type { App } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { LogEvent } from "@antumbra/platform-runner/log.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";

const LOG = "log:stop";
const RUNNER = "runner:stop";

export const berth = Effect.fn("StopTest.berth")(function* (app: App) {
	const runner = yield* connectRunner({ runnerId: RUNNER, logId: LOG, backends: ["claude"], imageInputBackends: [] });
	const append = (cursor: number, event: LogEvent) => runner.append([{ logId: LOG, cursor, at: cursor, event }]);
	const rest = (cursor: number, sessionId: string) =>
		append(cursor, {
			type: "ProviderEvent",
			sessionId,
			observation: "live",
			event: { type: "turn.completed", status: "completed", raw: { source: "scripted", kind: "turn.completed", payload: "{}" } },
		});
	const open = Effect.fn("StopTest.open")(function* (cursor: number, requestId: string, agentId: string, sessionId: string) {
		yield* append(cursor, {
			type: "SessionStarted",
			requestId,
			sessionId,
			agentId,
			backend: "claude",
			cwd: "/berth",
			nativeRef: "native",
			runnerId: RUNNER,
			toolSetVersion: "1",
		});
		yield* append(cursor + 1, { type: "InputAccepted", requestId, sessionId, inputId: "charter" });
	});
	return {
		append,
		open,
		rest,
		runner,
		spawn: Effect.fn("StopTest.spawn")(function* (request: Id.Request, role: string) {
			const { agentId, sessionId } = identity(request);
			yield* app.api.agents.spawn({ requestId: request, role, backend: "claude", model: null, effort: null });
			yield* open(0, request, agentId, sessionId);
			return { agentId, sessionId };
		}),
		stop: Effect.fn("StopTest.stop")(function* (cursor: number, sessionId: string, requestId = "stop") {
			yield* app.api.sessions.stop({
				requestId: Id.Request.make(requestId),
				sessionId: SessionId.make(sessionId),
				reason: "admiral",
				requestedAt: new Date(cursor).toISOString(),
			});
			yield* append(cursor, { type: "SessionInterrupted", sessionId, requestId });
			yield* rest(cursor + 1, sessionId);
		}),
	};
});
