import type { App } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { type Evidence, observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { HAND } from "#test/kit.ts";

export const ROOT = SessionId.make("mail-root");
const START = Request.make("mail-start");
export const sessionEvidence = Effect.fn("MailTest.sessionEvidence")(function* (
	cursor: number,
	evidence: typeof Evidence.Type,
	operationId: string = START,
) {
	const commit = yield* Commit;
	yield* commit.observe(observed, {
		logId: "mail-runner",
		cursor,
		at: cursor,
		requestId: START,
		payload: { sessionId: ROOT, nodeRef: null, origin: null, operationId, evidence },
	});
});

export const working = Effect.fn("MailTest.working")(function* (app: App) {
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
		toolSetVersion: "1",
		tools: [],
	});
	yield* sessionEvidence(0, {
		type: "started",
		agentId: HAND,
		backend: "claude",
		cwd: "/berth",
		nativeRef: "native",
		runnerId: "runner",
		toolSetVersion: "1",
	});
	yield* sessionEvidence(1, { type: "input-accepted", inputId: "charter" });
});
