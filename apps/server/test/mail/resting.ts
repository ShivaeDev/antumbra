import type { App } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { LogEvent } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { HAND } from "#test/mail/kit.ts";

export const ROOT = SessionId.make("mail-root");
const START = Request.make("mail-start");

export const working = Effect.fn("MailTest.working")(function* (app: App) {
	const runner = yield* connectRunner({ runnerId: "runner", logId: "mail-runner", backends: [], imageInputBackends: [] });
	const append = (cursor: number, event: LogEvent) => runner.append([{ logId: "mail-runner", cursor, at: cursor, event }]);
	yield* app.api.starts.request({
		requestId: START,
		agentId: AgentId.make(HAND),
		sessionId: ROOT,
		voyageId: null,
		pieceId: null,
		backend: "claude",
		model: null,
		effort: null,
		role: "hand",
		charter: "Sound the reef",
		source: "direct",
		toolSetVersion: "1",
		tools: [],
	});
	yield* append(0, {
		type: "SessionStarted",
		requestId: START,
		sessionId: ROOT,
		agentId: HAND,
		backend: "claude",
		cwd: "/berth",
		nativeRef: "native",
		runnerId: "runner",
		toolSetVersion: "1",
	});
	yield* append(1, { type: "InputAccepted", requestId: START, sessionId: ROOT, inputId: "charter" });
	return {
		rest: (cursor: number) =>
			append(cursor, {
				type: "ProviderEvent",
				sessionId: ROOT,
				observation: "live",
				event: { type: "turn.completed", status: "completed", raw: { source: "scripted", kind: "turn.completed", payload: "{}" } },
			}),
		accept: (cursor: number, requestId: string) => append(cursor, { type: "InputAccepted", sessionId: ROOT, requestId, inputId: requestId }),
	};
});
