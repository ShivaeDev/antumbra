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
