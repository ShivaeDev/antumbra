import { answered, it } from "@antumbra/app-testing/entry.ts";
import { lifecycleClient } from "@antumbra/app-testing/lifecycle.ts";
import { connectRunner, type LogEntry } from "@antumbra/app-testing/runner.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { wakeWords } from "@antumbra/platform-prompts/wake.ts";
import { expect } from "vitest";

const registration = { runnerId: "runner", logId: "restart-switch", backends: ["claude"], imageInputBackends: [] };
const CUT = SessionId.make("cut-mid-turn");

const entries: readonly LogEntry[] = [
	{
		logId: registration.logId,
		at: 100,
		cursor: 0,
		event: {
			type: "SessionStarted",
			sessionId: CUT,
			requestId: `start-${CUT}`,
			agentId: CUT,
			backend: "claude",
			cwd: "/berth",
			nativeRef: CUT,
			runnerId: registration.runnerId,
			toolSetVersion: "v1",
		},
	},
	{
		logId: registration.logId,
		at: 100,
		cursor: 1,
		event: { type: "InputAccepted", sessionId: CUT, requestId: `start-${CUT}`, inputId: `charter-${CUT}` },
	},
];

it.app("a root cut mid-turn keeps its place while the restart switch is off, and resumes when it goes back on", function* (app) {
	const runner = yield* connectRunner(registration);
	const lifecycle = yield* lifecycleClient;
	yield* runner.append(entries);
	yield* lifecycle("lifecycle.recordRestart", { requestId: "record" });
	yield* app.api.settings.setFlag({ key: "wakeAfterRestart", on: false });
	yield* lifecycle("lifecycle.honorRestart", { requestId: "held" });
	expect(yield* answered(app.api.lifecycle.pending({}))).toEqual([CUT]);
	expect(yield* answered(app.api.sessions.operations({ sessionId: CUT }))).toEqual([]);
	yield* app.api.settings.setFlag({ key: "wakeAfterRestart", on: true });
	yield* lifecycle("lifecycle.honorRestart", { requestId: "honored" });
	expect(yield* answered(app.api.lifecycle.pending({}))).toBeNull();
	expect(yield* answered(app.api.sessions.operations({ sessionId: CUT }))).toMatchObject([{ kind: "wake", reason: wakeWords }]);
});
