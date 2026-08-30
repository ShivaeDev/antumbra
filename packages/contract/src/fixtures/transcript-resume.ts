import { known, raw, storedEvents } from "#fixtures/transcript.ts";
import type { SessionEvent } from "#sight.ts";

export const wokenEvents: ReadonlyArray<SessionEvent> = [
	known(13, {
		raw: raw("system/session_state_changed", '{"state":"running"}'),
		state: "running",
		type: "session.state",
	}),
	known(14, {
		raw: raw("system/background_tasks_changed", '{"tasks":[{"task_id":"bg-1"}]}'),
		tasks: [
			{
				description: "pnpm ready",
				id: "bg-1",
				kind: "shell",
			},
		],
		type: "session.background",
	}),
];

export const laterEvent: SessionEvent = known(15, {
	raw: raw("assistant", '{"role":"assistant"}'),
	role: "agent",
	text: "Reading the grouping now — the cut-off belongs where the rows are bucketed, not where they are drawn.",
	type: "message",
});

export const cachedTurnEvents: ReadonlyArray<SessionEvent> = [
	known(16, {
		cacheReadTokens: 96240,
		cacheWriteTokens: 0,
		costUsd: 0.0188,
		cumulativeCostUsd: 0.06,
		inputTokens: 1410,
		model: "claude-fable-5",
		outputTokens: 210,
		raw: raw("usage", '{"cache_read_input_tokens":96240}'),
		type: "usage",
	}),
	known(17, {
		raw: raw("system/background_tasks_changed", '{"tasks":[]}'),
		tasks: [],
		type: "session.background",
	}),
];

export const closingEvent: SessionEvent = known(18, {
	durationMs: 4100,
	raw: raw("result", '{"status":"completed"}'),
	status: "completed",
	type: "turn.completed",
});

export const restingEvent: SessionEvent = known(19, {
	raw: raw("system/session_state_changed", '{"state":"idle"}'),
	state: "idle",
	type: "session.state",
});

export const sessionJournal: ReadonlyArray<SessionEvent> = [
	...storedEvents,
	...wokenEvents,
	laterEvent,
	...cachedTurnEvents,
	closingEvent,
	restingEvent,
];
