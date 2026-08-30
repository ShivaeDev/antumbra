import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import type { SessionEvent } from "#sight.ts";

// why: the harness is the only place the transcript is seen with real shapes
// in it, so the scripted session carries one of every kind the view draws —
// both sides speaking, a thought, a call that worked, a call that failed, a
// provider payload and the telemetry between turns.
export const raw = (kind: string, payload: string) => ({
	kind,
	payload,
	source: "claude",
});

export const known = (seq: number, event: AgentEvent): SessionEvent => ({
	event: { _tag: "Known", event },
	seq,
	sessionId: "session-1",
});

const grep = JSON.stringify({
	description: "Search the quay for where landed rows are grouped",
	pattern: "landed",
	path: "packages/renderer/src/quay",
});

const report = [
	"`groups.ts` puts every landed row in one bucket and nothing ever takes it",
	"out again, so the group only grows.",
	"",
	"- the group is built from the whole feed",
	"- nothing reads `landedAt`",
	"",
	"Next: give the group a cut-off and leave the rest of the grouping alone.",
].join("\n");

export const storedEvents: ReadonlyArray<SessionEvent> = [
	known(0, {
		nativeRef: "thread-9f2c",
		raw: raw("system/init", '{"session":"thread-9f2c"}'),
		type: "session.opened",
	}),
	known(1, {
		raw: raw("user", '{"role":"user"}'),
		role: "user",
		text: "The quay keeps showing changes that landed days ago. Find out why and say what you would change.",
		type: "message",
	}),
	known(2, {
		raw: raw("assistant", '{"thinking":true}'),
		text: "The quay groups rows by state. If nothing ever drops the landed group, it grows without a bound.",
		type: "thinking",
	}),
	known(3, {
		input: grep,
		name: "Grep",
		raw: raw("tool_use", '{"name":"Grep"}'),
		toolId: "tool-1",
		type: "tool.started",
	}),
	known(4, {
		ok: true,
		output: "packages/renderer/src/quay/groups.ts:14\npackages/renderer/src/quay/groups.ts:31\n2 files matched",
		raw: raw("tool_result", '{"toolId":"tool-1"}'),
		toolId: "tool-1",
		type: "tool.completed",
	}),
	known(5, {
		raw: raw("assistant", '{"role":"assistant"}'),
		role: "agent",
		text: report,
		type: "message",
	}),
	known(6, {
		input: JSON.stringify({ file_path: "packages/renderer/src/quay/group.ts" }),
		name: "Read",
		raw: raw("tool_use", '{"name":"Read"}'),
		toolId: "tool-2",
		type: "tool.started",
	}),
	known(7, {
		ok: false,
		output: "File does not exist: packages/renderer/src/quay/group.ts",
		raw: raw("tool_result", '{"toolId":"tool-2"}'),
		toolId: "tool-2",
		type: "tool.completed",
	}),
	known(8, {
		raw: raw("stream/heartbeat", '{"kind":"heartbeat","seq":8}'),
		type: "raw",
	}),
	// why: a log outlives the words it was written with, so one row is left in
	// the envelope the domain uses for an event it can no longer name.
	{
		event: {
			_tag: "Unknown",
			kind: "thread/status/changed",
			payload: '{"status":"working","thread":"thread-9f2c"}',
		},
		seq: 9,
		sessionId: "session-1",
	},
	known(10, {
		cacheReadTokens: 4820,
		cacheWriteTokens: 12100,
		costUsd: 0.0412,
		cumulativeCostUsd: 0.0412,
		inputTokens: 1500,
		model: "claude-fable-5",
		outputTokens: 730,
		raw: raw("usage", '{"input":1500}'),
		type: "usage",
	}),
	known(11, {
		durationMs: 12300,
		raw: raw("result", '{"status":"completed"}'),
		status: "completed",
		type: "turn.completed",
	}),
	known(12, {
		raw: raw("system/session_state_changed", '{"state":"idle"}'),
		state: "idle",
		type: "session.state",
	}),
];
