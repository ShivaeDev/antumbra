import type { TranscriptItem } from "@antumbra/domain-sessions/rows/transcript.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { expect, it } from "vitest";
import { deriveTranscript } from "#transcript/derive.ts";
import type { SessionEvent } from "#transcript/types.ts";

const raw = (kind: string, payload: string) => ({ kind, payload, source: "codex" });

const streamed = (...events: ReadonlyArray<AgentEvent>): ReadonlyArray<SessionEvent> => events.map((event, seq) => ({ event, seq }));

const opened: AgentEvent = { nativeRef: "thread-one", raw: raw("system/init", "{}"), type: "session.opened" };
const running: AgentEvent = { raw: raw("turn/started", "{}"), state: "running", type: "session.state" };
const idle: AgentEvent = { raw: raw("turn/completed", "{}"), state: "idle", type: "session.state" };
const said: AgentEvent = { raw: raw("item/completed", "{}"), role: "agent", text: "on it", type: "message" };
const allowed: AgentEvent = { raw: raw("account/rateLimits/updated", "{}"), status: "allowed", type: "rate.limit", windows: [] };

const shownAs = (item: TranscriptItem): ReadonlyArray<string> => {
	if (item.kind === "telemetry") {
		return [item.label];
	}
	return item.kind === "raw" ? [`raw ${item.payload}`] : [];
};

const labels = (events: ReadonlyArray<SessionEvent>): ReadonlyArray<string> => deriveTranscript(events).flatMap(shownAs);

it("shows a reading once until it says something else", () => {
	expect(labels(streamed(opened, running, running, idle, idle, running))).toEqual([
		"session opened · codex thread-one",
		"state · running",
		"state · idle",
		"state · running",
	]);
});

it("shows a reading once however far apart its repeats arrive", () => {
	expect(labels(streamed(allowed, opened, allowed, said, opened, allowed))).toEqual(["rate limit", "session opened · codex thread-one"]);
});

it("shows every distinct provider record and folds an exact repeat", () => {
	const starting: AgentEvent = { raw: raw("mcpServer/startupStatus/updated", '{"name":"node_repl","status":"starting"}'), type: "raw" };
	const ready: AgentEvent = { raw: raw("mcpServer/startupStatus/updated", '{"name":"node_repl","status":"ready"}'), type: "raw" };
	const other: AgentEvent = { raw: raw("mcpServer/startupStatus/updated", '{"name":"cua_repl","status":"ready"}'), type: "raw" };
	expect(labels(streamed(starting, ready, other, ready))).toEqual([
		'raw {"name":"node_repl","status":"starting"}',
		'raw {"name":"node_repl","status":"ready"}',
		'raw {"name":"cua_repl","status":"ready"}',
	]);
});

it("keeps every turn's own usage and completion", () => {
	const usage: AgentEvent = { inputTokens: 10, outputTokens: 20, raw: raw("result/success", "{}"), type: "usage" };
	const completed: AgentEvent = { durationMs: 1000, raw: raw("result/success", "{}"), status: "completed", type: "turn.completed" };
	expect(labels(streamed(usage, completed, usage, completed))).toEqual([
		"usage · in 10 · out 20",
		"turn completed · 1.0s",
		"usage · in 10 · out 20",
		"turn completed · 1.0s",
	]);
});
