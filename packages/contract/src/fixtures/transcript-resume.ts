import { known, raw, storedEvents } from "#fixtures/transcript.ts";
import type { SessionEvent } from "#sight.ts";

// why: the beat a resume is read by. The turn that follows it reads almost its
// whole context out of the cache — 1.4k fresh input against 96k cache reads —
// which is the one thing a reader wants to see when a long session picks back
// up, and it is only visible because the categories are kept apart.
export const wokenEvents: ReadonlyArray<SessionEvent> = [
	known(13, {
		raw: raw("system/session_state_changed", '{"state":"running"}'),
		state: "running",
		type: "session.state",
	}),
	known(14, {
		raw: raw(
			"system/background_tasks_changed",
			'{"tasks":[{"task_id":"bg-1"}]}',
		),
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

// why: one ordered journal, so the query that rehydrates a session and the feed
// that follows it are reading the same record rather than two halves of one.
export const sessionJournal: ReadonlyArray<SessionEvent> = [
	...storedEvents,
	...wokenEvents,
	laterEvent,
	...cachedTurnEvents,
	closingEvent,
	restingEvent,
];
