import type { SessionEvent } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { deriveTranscript } from "#transcript/derive.ts";

const event = (seq: number, kind: string, payload: unknown): SessionEvent => ({
	kind,
	payload: typeof payload === "string" ? payload : JSON.stringify(payload),
	seq,
	sessionId: "session-1",
});

const assistant = (seq: number, content: ReadonlyArray<unknown>) =>
	event(seq, "assistant", { message: { content, role: "assistant" } });

describe("deriveTranscript", () => {
	it("turns text blocks into role-labelled messages", () => {
		const items = deriveTranscript([
			assistant(0, [{ text: "hello, admiral", type: "text" }]),
			event(1, "user", { message: { content: "hello back", role: "user" } }),
		]);
		expect(items).toEqual([
			{ kind: "message", role: "assistant", seq: 0, text: "hello, admiral" },
			{ kind: "message", role: "user", seq: 1, text: "hello back" },
		]);
	});

	it("pairs a tool_use with its tool_result across events", () => {
		const items = deriveTranscript([
			assistant(0, [
				{ id: "tool-1", input: { path: "/tmp" }, name: "ls", type: "tool_use" },
			]),
			event(1, "user", {
				message: {
					content: [
						{
							content: [{ text: "file-a file-b", type: "text" }],
							tool_use_id: "tool-1",
							type: "tool_result",
						},
					],
					role: "user",
				},
			}),
		]);
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual({
			input: '{"path":"/tmp"}',
			kind: "tool",
			name: "ls",
			result: "file-a file-b",
			seq: 0,
		});
	});

	it("renders result events as telemetry dividers, never boundaries", () => {
		const items = deriveTranscript([
			assistant(0, [{ text: "done", type: "text" }]),
			event(1, "result/success", { duration_ms: 2300, total_cost_usd: 0.0042 }),
			assistant(2, [{ text: "more after the divider", type: "text" }]),
		]);
		expect(items.map((item) => item.kind)).toEqual([
			"message",
			"telemetry",
			"message",
		]);
		expect(items[1]).toMatchObject({
			label: "result/success · 2.3s · $0.0042",
		});
	});

	it("labels system events with their model when present", () => {
		const items = deriveTranscript([
			event(0, "system/init", { model: "claude-fable-5" }),
		]);
		expect(items[0]).toMatchObject({
			kind: "telemetry",
			label: "system/init · claude-fable-5",
		});
	});

	it("renders unknown kinds raw — never dropped, never fatal", () => {
		const items = deriveTranscript([
			event(0, "stream_event/exotic", '{"anything": true}'),
			event(1, "gibberish", "not even json {"),
		]);
		expect(items).toEqual([
			{
				kind: "raw",
				label: "stream_event/exotic",
				payload: '{"anything": true}',
				seq: 0,
			},
			{ kind: "raw", label: "gibberish", payload: "not even json {", seq: 1 },
		]);
	});
});
