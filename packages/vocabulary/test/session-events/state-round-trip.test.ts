import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "vitest";
import { projectHistoricalAgentEvent } from "#session-events/historical.ts";

const raw = {
	kind: "system/session_state_changed",
	payload: '{"state":"requires_action"}',
	source: "claude",
};

// why: the journal stores the event type as the row kind and the whole event
// as JSON, so a shape that does not survive that trip is a shape the record
// silently downgrades to Unknown. These three are new members of the union, so
// the trip is asserted rather than assumed.
const trip = (event: AgentEvent) => projectHistoricalAgentEvent(event.type, JSON.stringify(event));

it("a session state survives the journal round trip", () => {
	const event: AgentEvent = {
		raw,
		state: "awaiting-input",
		type: "session.state",
	};
	expect(trip(event)).toEqual({ _tag: "Known", event });
});

it("a background set survives the trip, empty or full", () => {
	const empty: AgentEvent = { raw, tasks: [], type: "session.background" };
	expect(trip(empty)).toEqual({ _tag: "Known", event: empty });
	const full: AgentEvent = {
		raw,
		tasks: [{ description: "pnpm ready", id: "bg-1", kind: "shell" }],
		type: "session.background",
	};
	expect(trip(full)).toEqual({ _tag: "Known", event: full });
});

it("a usage split survives the trip, and one without cache counts still does", () => {
	const split: AgentEvent = {
		cacheReadTokens: 96240,
		cacheWriteTokens: 0,
		costUsd: 0.0188,
		cumulativeCostUsd: 0.06,
		inputTokens: 1410,
		outputTokens: 210,
		raw,
		type: "usage",
	};
	expect(trip(split)).toEqual({ _tag: "Known", event: split });
	const bare: AgentEvent = {
		inputTokens: 10,
		outputTokens: 2,
		raw,
		type: "usage",
	};
	expect(trip(bare)).toEqual({ _tag: "Known", event: bare });
});

// why: a state word this vocabulary does not have must not be admitted by the
// decoder — a row written by a newer writer is Unknown evidence, not a state.
it("a state word outside the three is not admitted", () => {
	const payload = JSON.stringify({
		raw,
		state: "notLoaded",
		type: "session.state",
	});
	expect(projectHistoricalAgentEvent("session.state", payload)).toEqual({
		_tag: "Unknown",
		kind: "session.state",
		payload,
	});
});
