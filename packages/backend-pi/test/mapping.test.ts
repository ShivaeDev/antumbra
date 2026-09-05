import { describe, expect, it } from "@effect/vitest";
import { toAgentEvents } from "#mapping.ts";
import type { PiEvent } from "#runtime.ts";
import { asked, assistant, ended, toolEnd, toolStart } from "#test/events.ts";

const NONE = new Set<string>();

const kinds = (events: ReturnType<typeof toAgentEvents>): ReadonlyArray<string> => events.map((event) => event.type);

describe("pi events on the neutral log", () => {
	it("reports the session running when a run starts", () => {
		expect(toAgentEvents({ type: "agent_start" }, NONE)).toEqual([
			{ raw: { kind: "agent_start", payload: "{}", source: "pi" }, state: "running", type: "session.state" },
		]);
	});

	it("completes the turn when the run ends and rests the session", () => {
		const events = toAgentEvents(ended("stop"), NONE);
		expect(kinds(events)).toEqual(["turn.completed", "session.state"]);
		expect(events[0]).toMatchObject({ status: "completed" });
		expect(events[1]).toMatchObject({ state: "idle" });
	});

	it("reads an aborted ending as an interruption and an errored one as a failure", () => {
		expect(toAgentEvents(ended("aborted"), NONE)[0]).toMatchObject({ status: "interrupted" });
		expect(toAgentEvents(ended("error", "the provider gave up"), NONE)[0]).toMatchObject({ status: "failed" });
	});

	it("keeps the stop reason of the ending message as evidence", () => {
		const [completed] = toAgentEvents(ended("error", "the provider gave up"), NONE);
		expect(JSON.parse(completed?.raw.payload ?? "null")).toEqual({ errorMessage: "the provider gave up", stopReason: "error" });
	});

	it("says what the agent said, what it thought, and what it spent", () => {
		const message: PiEvent = {
			message: assistant([
				{ thinking: "weighing it", type: "thinking" },
				{ text: "all done", type: "text" },
			]),
			type: "message_end",
		};
		const events = toAgentEvents(message, NONE);
		expect(kinds(events)).toEqual(["thinking", "message", "usage"]);
		expect(events[1]).toMatchObject({ role: "agent", text: "all done" });
		expect(events[2]).toMatchObject({ cacheReadTokens: 3, costUsd: 0.1, inputTokens: 11, model: "claude-sonnet-4-5", outputTokens: 5 });
	});

	it("says nothing for an assistant message that only called tools", () => {
		const message: PiEvent = { message: assistant([{ arguments: {}, id: "call-1", name: "read", type: "toolCall" }]), type: "message_end" };
		expect(kinds(toAgentEvents(message, NONE))).toEqual(["usage"]);
	});

	it("records what the human asked", () => {
		expect(toAgentEvents(asked("go on then"), NONE)[0]).toMatchObject({ role: "user", text: "go on then" });
	});

	it("leaves tool results to the tool events that already carry them", () => {
		const message: PiEvent = {
			message: { content: [], isError: false, role: "toolResult", timestamp: 0, toolCallId: "call-1", toolName: "read" },
			type: "message_end",
		};
		expect(toAgentEvents(message, NONE)).toEqual([]);
	});

	it("marks a tool antumbra serves and leaves pi's own unmarked", () => {
		expect(toAgentEvents(toolStart("post_board_entry"), new Set(["post_board_entry"]))[0]).toMatchObject({
			input: '{"path":"README.md"}',
			name: "post_board_entry",
			servedBy: "antumbra",
			toolId: "call-1",
		});
		expect(toAgentEvents(toolStart("read"), new Set(["post_board_entry"]))[0]).not.toHaveProperty("servedBy");
	});

	it("joins what a tool returned and carries whether it worked", () => {
		expect(toAgentEvents(toolEnd(false), NONE)[0]).toMatchObject({ ok: true, output: "first\nsecond", toolId: "call-1" });
		expect(toAgentEvents(toolEnd(true), NONE)[0]).toMatchObject({ ok: false });
	});

	it("emits nothing for pi events the neutral vocabulary has no word for", () => {
		expect(toAgentEvents({ type: "turn_start" }, NONE)).toEqual([]);
		expect(toAgentEvents({ message: assistant([{ text: "ignored", type: "text" }]), type: "message_start" }, NONE)).toEqual([]);
		expect(toAgentEvents({ followUp: [], steering: ["wait"], type: "queue_update" }, NONE)).toEqual([]);
	});
});
