import { expect, it } from "vitest";
import { projectHistoricalAgentEvent } from "#session-events/historical.ts";

const raw = {
	kind: "provider/message",
	payload: "raw bytes",
	source: "scripted",
};

const messagePayload = JSON.stringify({
	raw,
	role: "agent",
	text: "charted",
	type: "message",
});

it("accepts a known event only when its stored kind and decoded type agree", () => {
	expect(projectHistoricalAgentEvent("message", messagePayload)).toEqual({
		_tag: "Known",
		event: {
			raw,
			role: "agent",
			text: "charted",
			type: "message",
		},
	});
	expect(projectHistoricalAgentEvent("thinking", messagePayload)).toEqual({
		_tag: "Unknown",
		kind: "thinking",
		payload: messagePayload,
	});
});

it("preserves future, invalid JSON, and malformed known payload bytes exactly", () => {
	const rows = [
		["future.event", "future bytes \u0000 {"],
		["message", "not json {"],
		["message", '{"type":"message"}'],
	] as const;
	for (const [kind, payload] of rows) {
		expect(projectHistoricalAgentEvent(kind, payload)).toEqual({
			_tag: "Unknown",
			kind,
			payload,
		});
	}
});

it("keeps a provider RawEvent distinct from unknown historical data", () => {
	const event = { raw, type: "raw" } as const;
	expect(projectHistoricalAgentEvent("raw", JSON.stringify(event))).toEqual({
		_tag: "Known",
		event,
	});
});
