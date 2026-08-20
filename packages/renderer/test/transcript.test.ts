import type { SessionEvent, SessionTreeNode } from "@antumbra/contract";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { describe, expect, it } from "vitest";
import { deriveTranscript } from "#transcript/derive.ts";

const raw = { kind: "wire/kind", payload: "{}", source: "scripted" };

const row = (seq: number, event: AgentEvent): SessionEvent => ({
	event: { _tag: "Known", event },
	seq,
	sessionId: "session-1",
});

const SUBSESSION = "a2b8c2a1b3d038e69";

// why: the tree names the node, so a marker in the parent's transcript wears
// the tree's name rather than whatever the frame happened to say — the two
// have to agree about one node, and the tree is the one that read the record.
const child: SessionTreeNode = {
	completeness: "complete",
	depth: 1,
	displayName: "Map the quay grouping",
	id: "session-child",
	nativeRef: SUBSESSION,
	outcome: "completed",
	status: "closed",
};

const delegated: ReadonlyArray<SessionEvent> = [
	row(0, {
		charter: "read the cluster",
		kind: "Explore",
		label: "Map session execution",
		raw,
		spawnedBy: "toolu_01",
		subsessionRef: SUBSESSION,
		type: "subsession.opened",
	}),
	row(1, {
		durationMs: 6245,
		outcome: "completed",
		raw,
		subsessionRef: SUBSESSION,
		tokens: 17080,
		type: "subsession.ended",
	}),
];

const message = (seq: number, role: "agent" | "user", text: string) =>
	row(seq, { raw, role, text, type: "message" });

describe("deriveTranscript", () => {
	it("turns message events into role-labelled messages", () => {
		const items = deriveTranscript([
			message(0, "agent", "hello, admiral"),
			message(1, "user", "hello back"),
		]);
		expect(items).toEqual([
			{ kind: "message", role: "agent", seq: 0, text: "hello, admiral" },
			{ kind: "message", role: "user", seq: 1, text: "hello back" },
		]);
	});

	it("thinking renders as its own quiet item", () => {
		const items = deriveTranscript([
			row(0, { raw, text: "weighing options", type: "thinking" }),
		]);
		expect(items).toEqual([
			{ kind: "thinking", seq: 0, text: "weighing options" },
		]);
	});

	it("drops narration with no words in it and trims what is left", () => {
		const items = deriveTranscript([
			message(0, "agent", "  hello, admiral  "),
			message(1, "agent", ""),
			row(2, { raw, text: "   ", type: "thinking" }),
		]);
		expect(items).toEqual([
			{ kind: "message", role: "agent", seq: 0, text: "hello, admiral" },
		]);
	});

	it("pairs tool.started with its tool.completed across events", () => {
		const items = deriveTranscript([
			row(0, {
				input: '{"path":"/tmp"}',
				name: "ls",
				raw,
				toolId: "tool-1",
				type: "tool.started",
			}),
			message(1, "agent", "meanwhile"),
			row(2, {
				ok: false,
				output: "no such dir",
				raw,
				toolId: "tool-1",
				type: "tool.completed",
			}),
		]);
		expect(items).toHaveLength(2);
		expect(items[0]).toEqual({
			input: '{"path":"/tmp"}',
			kind: "tool",
			name: "ls",
			ok: false,
			result: "no such dir",
			seq: 0,
		});
	});

	it("usage, turn.completed and session.opened are telemetry dividers, never boundaries", () => {
		const items = deriveTranscript([
			row(0, {
				nativeRef: "thread-9",
				raw: { ...raw, source: "codex" },
				type: "session.opened",
			}),
			message(1, "agent", "done"),
			row(2, {
				costUsd: 0.0042,
				inputTokens: 120,
				model: "claude-fable-5",
				outputTokens: 30,
				raw,
				type: "usage",
			}),
			row(3, {
				durationMs: 2300,
				raw,
				status: "interrupted",
				type: "turn.completed",
			}),
			message(4, "agent", "more after the divider"),
		]);
		expect(items.map((item) => item.kind)).toEqual([
			"telemetry",
			"message",
			"telemetry",
			"telemetry",
			"message",
		]);
		expect(items[0]).toMatchObject({
			label: "session opened · codex thread-9",
		});
		expect(items[2]).toMatchObject({
			label: "usage · claude-fable-5 · 120→30 tokens · $0.0042",
		});
		expect(items[3]).toMatchObject({ label: "turn interrupted · 2.3s" });
	});

	it("delegation marks the spot the work left and points at the node holding it", () => {
		const items = deriveTranscript(delegated, [child]);
		expect(items).toEqual([
			{
				displayName: "Map the quay grouping",
				kind: "delegation",
				nodeId: "session-child",
				outcome: undefined,
				seq: 0,
				state: "opened",
			},
			{
				displayName: "Map the quay grouping",
				kind: "delegation",
				nodeId: "session-child",
				outcome: "completed",
				seq: 1,
				state: "ended",
			},
		]);
	});

	it("a marker with no tree behind it still says what was handed off", () => {
		expect(deriveTranscript(delegated)).toEqual([
			{
				displayName: "Map session execution",
				kind: "delegation",
				nodeId: undefined,
				outcome: undefined,
				seq: 0,
				state: "opened",
			},
			{
				displayName: "Unnamed Subagent",
				kind: "delegation",
				nodeId: undefined,
				outcome: "completed",
				seq: 1,
				state: "ended",
			},
		]);
	});

	it("an opening the provider barely described is named outright", () => {
		const items = deriveTranscript([
			row(0, {
				raw,
				spawnedBy: "toolu_01",
				subsessionRef: "a2b8c2a1b3d038e69",
				type: "subsession.opened",
			}),
		]);
		expect(items[0]).toMatchObject({
			displayName: "Unnamed Subagent",
			kind: "delegation",
		});
	});

	it("a gap in observation is a notice in plain words, never an error", () => {
		const items = deriveTranscript([
			row(0, {
				detail: "the stream detached 4200ms after this node opened",
				gapKind: "stream-detached",
				raw,
				type: "subsession.gap",
			}),
		]);
		expect(items[0]).toEqual({
			detail: "the stream detached 4200ms after this node opened",
			kind: "notice",
			seq: 0,
			title: "the stream stopped before this work reported an ending",
		});
	});

	it("raw events show the provider's kind; undecodable rows render raw too — never dropped, never fatal", () => {
		const items = deriveTranscript([
			row(0, {
				raw: {
					kind: "thread/status/changed",
					payload: '{"anything":true}',
					source: "codex",
				},
				type: "raw",
			}),
			{
				event: {
					_tag: "Unknown",
					kind: "gibberish",
					payload: "not even json {",
				},
				seq: 1,
				sessionId: "session-1",
			},
			{
				event: {
					_tag: "Unknown",
					kind: "message",
					payload: '{"type":"message"}',
				},
				seq: 2,
				sessionId: "session-1",
			},
		]);
		expect(items).toEqual([
			{
				kind: "raw",
				label: "codex thread/status/changed",
				payload: '{"anything":true}',
				seq: 0,
			},
			{ kind: "raw", label: "gibberish", payload: "not even json {", seq: 1 },
			{ kind: "raw", label: "message", payload: '{"type":"message"}', seq: 2 },
		]);
	});

	it("renders a mismatched historical envelope from its exact stored evidence", () => {
		const payload = JSON.stringify({
			raw,
			role: "agent",
			text: "the payload disagrees with its durable kind",
			type: "message",
		});
		expect(
			deriveTranscript([
				{
					event: { _tag: "Unknown", kind: "thinking", payload },
					seq: 9,
					sessionId: "session-1",
				},
			]),
		).toEqual([{ kind: "raw", label: "thinking", payload, seq: 9 }]);
	});
});
