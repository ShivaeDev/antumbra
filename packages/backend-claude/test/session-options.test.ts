import { expect, it } from "@effect/vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Option } from "effect";
import { sessionOptions } from "#session-options.ts";

const server = new McpServer({ name: "antumbra", version: "0.0.0" });

const base = {
	cwd: "/moorage/./crew",
	executable: "/usr/bin/false",
	resume: undefined,
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
	expect(options.allowedTools).toEqual([
		"mcp__antumbra__land_report",
		"mcp__antumbra__stand_down",
	]);
});

it("resuming names the transcript the provider already has", () => {
	const options = sessionOptions({
		...base,
		resume: "native-1",
		tools: Option.none(),
	});
	expect(options.resume).toBe("native-1");
});

// why: without it the provider forwards only a delegated agent's tool traffic,
// so everything the agent said would be missing from its transcript and nothing
// in the stream would say so. No session wants less than that.
it("every session asks for what its delegated agents said", () => {
	expect(
		sessionOptions({ ...base, tools: Option.none() }).forwardSubagentText,
	).toBe(true);
	expect(
		sessionOptions({ ...base, resume: "native-1", tools: Option.none() })
			.forwardSubagentText,
	).toBe(true);
});
