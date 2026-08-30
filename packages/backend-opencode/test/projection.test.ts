import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Option } from "effect";
import { openSessionProjection } from "#projection.ts";
import { frameFor } from "#session-frames.ts";
import {
	frame,
	part,
	SESSION,
	spoke,
	stepFinish,
	textPart,
	toolPart,
} from "#test/frames.ts";

const project = (frames: ReadonlyArray<unknown>): AgentEvent[] => {
	const projection = openSessionProjection();
	return frames.flatMap((raw) =>
		Option.match(frameFor(SESSION, raw), {
			onNone: () => [],
			onSome: projection.events,
		}),
	);
};

it("reports an agent's streamed text once, when the part ends", () => {
	const events = project([
		spoke("msg_a", "assistant"),
		part(textPart("msg_a", "par", false)),
		part(textPart("msg_a", "partial answer", true)),
	]);
	expect(events).toEqual([
		{
			raw: expect.anything(),
			role: "agent",
			text: "partial answer",
			type: "message",
		},
	]);
});

it("reports a user's text as soon as it appears, since it never streams", () => {
	const events = project([
		spoke("msg_u", "user"),
		part(textPart("msg_u", "do the thing", false)),
	]);
	expect(events).toEqual([
		{
			raw: expect.anything(),
			role: "user",
			text: "do the thing",
			type: "message",
		},
	]);
});

it("announces a tool call once it carries arguments and answers it once", () => {
	const events = project([
		spoke("msg_a", "assistant"),
		part(toolPart("msg_a", { input: {}, status: "pending" })),
		part(toolPart("msg_a", { input: { command: "ls" }, status: "running" })),
		part(toolPart("msg_a", { input: { command: "ls" }, status: "running" })),
		part(
			toolPart("msg_a", {
				input: { command: "ls" },
				output: "a\nb",
				status: "completed",
			}),
		),
	]);
	expect(events).toEqual([
		{
			input: '{"command":"ls"}',
			name: "bash",
			raw: expect.anything(),
			toolId: "call_1",
			type: "tool.started",
		},
		{
			ok: true,
			output: "a\nb",
			raw: expect.anything(),
			toolId: "call_1",
			type: "tool.completed",
		},
	]);
});

it("carries the answering model onto the spend of the step it finished", () => {
	const events = project([
		spoke("msg_a", "assistant", {
			modelID: "deepseek-v4-flash",
			providerID: "opencode-go",
		}),
		part(stepFinish("msg_a")),
	]);
	expect(events).toEqual([
		{
			cacheReadTokens: 7,
			cacheWriteTokens: 3,
			costUsd: 0.25,
			inputTokens: 11,
			model: "opencode-go/deepseek-v4-flash",
			outputTokens: 5,
			raw: expect.anything(),
			type: "usage",
		},
	]);
});

it("keeps a part whose message was never announced as raw evidence", () => {
	const events = project([part(textPart("msg_unseen", "orphaned", true))]);
	expect(events).toEqual([{ raw: expect.anything(), type: "raw" }]);
});

// why: the server sends kinds its own OpenAPI document does not list —
// `server.heartbeat` rides every stream — so an unmodelled frame has to stay
// evidence rather than take the session's log down.
it("keeps an undocumented frame kind as raw evidence", () => {
	const events = project([frame("server.heartbeat", { sessionID: SESSION })]);
	expect(events).toEqual([{ raw: expect.anything(), type: "raw" }]);
});

it("files nothing for a frame that names another session", () => {
	expect(project([frame("session.idle", { sessionID: "ses_other" })])).toEqual(
		[],
	);
});
