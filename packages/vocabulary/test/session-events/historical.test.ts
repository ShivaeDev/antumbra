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

const toolPayload = (origin?: { parentNode: string; spawnedBy: string }) =>
	JSON.stringify({
		input: "{}",
		name: "Grep",
		...(origin === undefined ? {} : { origin }),
		raw,
		toolId: "tool-1",
		type: "tool.started",
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

it("reads rows written before attribution existed and rows carrying it", () => {
	expect(projectHistoricalAgentEvent("tool.started", toolPayload())).toEqual({
		_tag: "Known",
		event: {
			input: "{}",
			name: "Grep",
			raw,
			toolId: "tool-1",
			type: "tool.started",
		},
	});
	const origin = { parentNode: "agent-1", spawnedBy: "toolu_01" };
	expect(projectHistoricalAgentEvent("tool.started", toolPayload(origin))).toEqual({
		_tag: "Known",
		event: {
			input: "{}",
			name: "Grep",
			origin,
			toolId: "tool-1",
			raw,
			type: "tool.started",
		},
	});
});

it("reads the subsession tree back out of the log", () => {
	const opened = {
		charter: "read the cluster",
		kind: "Explore",
		label: "Map session execution",
		raw,
		spawnedBy: "toolu_01",
		subsessionRef: "a2b8c2a1b3d038e69",
		type: "subsession.opened",
	} as const;
	expect(projectHistoricalAgentEvent("subsession.opened", JSON.stringify(opened))).toEqual({ _tag: "Known", event: opened });
	const ended = {
		durationMs: 6245,
		outcome: "interrupted",
		raw,
		subsessionRef: "a2b8c2a1b3d038e69",
		tokens: 17080,
		type: "subsession.ended",
	} as const;
	expect(projectHistoricalAgentEvent("subsession.ended", JSON.stringify(ended))).toEqual({ _tag: "Known", event: ended });
});

// why: a provider that names neither a subagent type, a description, nor a
// recoverable charter still opened a subsession, and the log must be able to
// say so without inventing the words it was not given.
it("reads an opening that names nothing but the node and its spawner", () => {
	const opened = {
		raw,
		spawnedBy: "toolu_01",
		subsessionRef: "a2b8c2a1b3d038e69",
		type: "subsession.opened",
	} as const;
	expect(projectHistoricalAgentEvent("subsession.opened", JSON.stringify(opened))).toEqual({ _tag: "Known", event: opened });
});

it("reads a gap in observation back as the gap it was", () => {
	const gap = {
		detail: "the stream detached mid-turn",
		gapKind: "stream-detached",
		raw,
		type: "subsession.gap",
	} as const;
	expect(projectHistoricalAgentEvent("subsession.gap", JSON.stringify(gap))).toEqual({ _tag: "Known", event: gap });
});

// why: an end naming an outcome this vocabulary never had is exactly the case
// the envelope exists for — the bytes stay whole and readable as evidence
// instead of the projection failing or guessing a nearer word.
it("keeps an end whose outcome this vocabulary does not know as raw evidence", () => {
	const payload = JSON.stringify({
		outcome: "killed",
		raw,
		subsessionRef: "a2b8c2a1b3d038e69",
		type: "subsession.ended",
	});
	expect(projectHistoricalAgentEvent("subsession.ended", payload)).toEqual({
		_tag: "Unknown",
		kind: "subsession.ended",
		payload,
	});
});

it("keeps a provider RawEvent distinct from unknown historical data", () => {
	const event = { raw, type: "raw" } as const;
	expect(projectHistoricalAgentEvent("raw", JSON.stringify(event))).toEqual({
		_tag: "Known",
		event,
	});
});
