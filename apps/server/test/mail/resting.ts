import type { App } from "@antumbra/app-testing/entry.ts";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import type { LogEvent } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { HAND } from "#test/mail/kit.ts";

const START = Request.make(HAND);
export const ROOT = identity(START).sessionId;

export const working = Effect.fn("MailTest.working")(function* (app: App) {
	const runner = yield* connectRunner({ runnerId: "runner", logId: "mail-runner", backends: [], imageInputBackends: [] });
	const append = (cursor: number, event: LogEvent) => runner.append([{ logId: "mail-runner", cursor, at: cursor, event }]);
	yield* app.api.agents.spawn({ requestId: START, role: "hand", backend: "claude", model: null, effort: null });
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
