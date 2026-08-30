import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "@effect/vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, Fiber, Option } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";
import { mirroringSessionStore } from "#adapters/session-store.ts";
import { sessionOptions } from "#session-options.ts";

const server = new McpServer({ name: "antumbra", version: "0.0.0" });

const base = {
	cwd: "/moorage/./crew",
	executable: "/usr/bin/false",
	resume: undefined,
	store: mirroringSessionStore(() => {}),
};

it("a session without tools carries no server and no allowance", () => {
	const options = sessionOptions({ ...base, tools: Option.none() });
	expect(options.cwd).toBe("/moorage/crew");
	expect(options.permissionMode).toBe("auto");
	expect(options.mcpServers).toBeUndefined();
	expect(options.allowedTools).toBeUndefined();
});

it("a session with tools hands the SDK the server instance itself", () => {
	const options = sessionOptions({
		...base,
		tools: Option.some({ names: ["land_report", "stand_down"], server }),
	});
	expect(options.mcpServers).toEqual({
		antumbra: { instance: server, name: "antumbra", type: "sdk" },
	});
	expect(options.allowedTools).toEqual(["mcp__antumbra__land_report", "mcp__antumbra__stand_down"]);
});

it("resuming names the transcript the provider already has", () => {
	const options = sessionOptions({
		...base,
		resume: "native-1",
		tools: Option.none(),
	});
	expect(options.resume).toBe("native-1");
});

// why: waking a sleeping session is one act — the transcript it already has is
// named and the words that woke it are said in it. `query` is called directly,
// so the two halves are rehearsed where this lane owns them: the options the
// SDK is opened with, and the prompt iterator it pulls from.
it.effect("a woken session names its transcript and hands over the words", () =>
	Effect.gen(function* () {
		const options = sessionOptions({
			...base,
			resume: "native-1",
			tools: Option.none(),
		});
		expect(options.resume).toBe("native-1");

		const woken: SDKUserMessage = {
			message: { content: "come about", role: "user" },
			parent_tool_use_id: null,
			type: "user",
		};
		const input = new InputQueue(() => {});
		const receipt = yield* Effect.forkChild(input.push(woken));
		yield* Effect.yieldNow;
		const iterator = input.stream()[Symbol.asyncIterator]();
		expect(yield* Effect.promise(() => iterator.next())).toEqual({
			done: false,
			value: woken,
		});
		yield* Fiber.join(receipt);
	}),
);

// why: without it the provider forwards only a delegated agent's tool traffic,
// so everything the agent said would be missing from its transcript and nothing
// in the stream would say so. No session wants less than that.
it("every session asks for what its delegated agents said", () => {
	expect(sessionOptions({ ...base, tools: Option.none() }).forwardSubagentText).toBe(true);
	expect(sessionOptions({ ...base, resume: "native-1", tools: Option.none() }).forwardSubagentText).toBe(true);
});
