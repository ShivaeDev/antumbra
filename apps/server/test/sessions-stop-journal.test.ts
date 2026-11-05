import { legacyFacts } from "@antumbra/app-testing/legacy.ts";
import { SessionId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { expect } from "vitest";

const SESSION = SessionId.make("session:stop");
const STOPPED_AT = "2026-09-13T09:00:00.000Z";

const started = {
	sessionId: SESSION,
	live: true,
	nodeRef: null,
	origin: null,
	operationId: "start",
	evidence: {
		type: "started",
		agentId: "agent:stop",
		backend: "claude",
		cwd: "/berth",
		nativeRef: "native",
		runnerId: "runner",
		toolSetVersion: "1",
	},
};

const stopped = { id: "stop", sessionId: SESSION, reason: "admiral", stoppedAt: STOPPED_AT };

legacyFacts.it("keeps a legacy stop held after replay and SQL projection rebuild", [], function* ({ seed, session, operations, rebuild }) {
	yield* seed([
		{ name: "SessionObserved", payload: started, requestId: "start", at: 100 },
		{ name: "SessionStopped", payload: stopped, requestId: "stop", at: 200 },
	]);
	yield* rebuild();
	expect(yield* session(SESSION)).toMatchObject({ id: SESSION, stoppedAt: STOPPED_AT });
	expect(yield* operations()).toMatchObject([{ id: "stop", kind: "interrupt", status: "requested" }]);
});
