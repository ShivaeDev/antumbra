import { expect, it } from "@effect/vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Option } from "effect";
import { mirroringSessionStore } from "#adapters/session-store.ts";
import { sessionOptions } from "#session-options.ts";

const server = new McpServer({ name: "antumbra", version: "0.0.0" });

const base = {
	constrainedPrompt: undefined,
	cwd: "/moorage/./crew",
	effort: undefined,
	executable: "/usr/bin/false",
	model: undefined,
	resume: undefined,
	skills: "/antumbra/skills",
	store: mirroringSessionStore(() => {}),
};

it("a session without tools carries no server and no allowance", () => {
	const options = sessionOptions({ ...base, tools: Option.none() });
	expect(options.cwd).toBe("/moorage/crew");
	expect(options.permissionMode).toBe("auto");
	expect(options.forwardSubagentText).toBe(true);
	expect(options.mcpServers).toBeUndefined();
	expect(options.allowedTools).toBeUndefined();
});

it("a session with tools hands the SDK the server instance itself", () => {
	const options = sessionOptions({
		...base,
		tools: Option.some({ names: ["land_report", "read_mail"], server }),
	});
	expect(options.mcpServers).toEqual({
		antumbra: { instance: server, name: "antumbra", type: "sdk" },
	});
	expect(options.allowedTools).toEqual(["mcp__antumbra__land_report", "mcp__antumbra__read_mail"]);
});

it("Antumbra's skills reach Claude Code as a local plugin", () => {
	const options = sessionOptions({ ...base, tools: Option.none() });
	expect(options.plugins).toEqual([{ path: "/antumbra/skills", type: "local" }]);
});

it("a constrained session runs on Antumbra's prompt and loads nothing of the admiral's own", () => {
	const options = sessionOptions({ ...base, constrainedPrompt: "Smooth this board.", tools: Option.none() });
	expect(options.systemPrompt).toBe("Smooth this board.");
	expect(options.settingSources).toEqual([]);
	expect(options.plugins).toBeUndefined();
	expect(options.tools).toEqual([]);
	expect(options.strictMcpConfig).toBe(true);
});

it("a constrained session still reaches the tools Antumbra serves it", () => {
	const options = sessionOptions({
		...base,
		constrainedPrompt: "Smooth this board.",
		tools: Option.some({ names: ["read_board"], server }),
	});
	expect(options.allowedTools).toEqual(["mcp__antumbra__read_board"]);
	expect(options.mcpServers).toEqual({
		antumbra: { instance: server, name: "antumbra", type: "sdk" },
	});
});

it("resuming names the transcript the provider already has", () => {
	const options = sessionOptions({
		...base,
		resume: "native-1",
		tools: Option.none(),
	});
	expect(options.resume).toBe("native-1");
});

it("the voyage's model and effort ride on the session options", () => {
	const options = sessionOptions({ ...base, effort: "xhigh", model: "opus", tools: Option.none() });
	expect(options.model).toBe("opus");
	expect(options.effort).toBe("xhigh");
});
