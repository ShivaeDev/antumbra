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
const delegateRunning: AgentEvent = { origin: { spawnedBy: "task" }, raw: raw("turn/started", "{}"), state: "running", type: "session.state" };

const rated = (status: "allowed" | "rejected", usedPercent?: number): AgentEvent => ({
	raw: raw("account/rateLimits/updated", "{}"),
	status,
	type: "rate.limit",
	windows: usedPercent === undefined ? [] : [{ usedPercent }],
});

const notice = (payload: string): AgentEvent => ({ raw: raw("mcpServer/startupStatus/updated", payload), type: "raw" });

const shownAs = (item: TranscriptItem): ReadonlyArray<string> => {
	if (item.kind === "telemetry") {
		return [item.label];
	}
	return item.kind === "raw" ? [`raw ${item.payload}`] : [];
};

const labels = (events: ReadonlyArray<SessionEvent>): ReadonlyArray<string> => deriveTranscript(events).flatMap(shownAs);

const shownFor = (event: AgentEvent): ReadonlyArray<string> => labels(streamed(event));

it("shows a reading once until it says something else", () => {
	expect(labels(streamed(opened, running, running, idle, idle, running))).toEqual([
		...shownFor(opened),
		...shownFor(running),
		...shownFor(idle),
		...shownFor(running),
	]);
});

it("shows a reading once however far apart its repeats arrive", () => {
	const allowed = rated("allowed");
	expect(labels(streamed(allowed, opened, allowed, said, opened, allowed))).toEqual([...shownFor(allowed), ...shownFor(opened)]);
});

it("shows a rate limit again when the share it reports moves", () => {
	const ninth = rated("allowed", 9);
	const tenth = rated("allowed", 10);
	expect(labels(streamed(ninth, ninth, tenth))).toEqual([...shownFor(ninth), ...shownFor(tenth)]);
});

it("shows every refusal, and the standing that follows one", () => {
	const allowed = rated("allowed");
	const rejected = rated("rejected");
	expect(labels(streamed(allowed, rejected, rejected, allowed))).toEqual([
		...shownFor(allowed),
		...shownFor(rejected),
		...shownFor(rejected),
		...shownFor(allowed),
	]);
});

it("shows a provider notice again when another notice came between", () => {
	const starting = notice('{"name":"node_repl","status":"starting"}');
	const ready = notice('{"name":"node_repl","status":"ready"}');
	const other = notice('{"name":"cua_repl","status":"ready"}');
	expect(labels(streamed(starting, ready, ready, other, ready))).toEqual([
		...shownFor(starting),
		...shownFor(ready),
		...shownFor(other),
		...shownFor(ready),
	]);
});

it("keeps a delegate's reading from hiding the session's own", () => {
	expect(labels(streamed(delegateRunning, running))).toEqual([...shownFor(delegateRunning), ...shownFor(running)]);
});

it("keeps every turn's own usage and completion", () => {
	const usage: AgentEvent = { inputTokens: 10, outputTokens: 20, raw: raw("result/success", "{}"), type: "usage" };
	const completed: AgentEvent = { durationMs: 1000, raw: raw("result/success", "{}"), status: "completed", type: "turn.completed" };
	expect(labels(streamed(usage, completed, usage, completed))).toEqual([
		...shownFor(usage),
		...shownFor(completed),
		...shownFor(usage),
		...shownFor(completed),
	]);
});
