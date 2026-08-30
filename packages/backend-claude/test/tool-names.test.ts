import { describe, expect, it } from "vitest";
import { blockEvent } from "#blocks.ts";

const raw = { kind: "assistant", payload: "{}", source: "claude" };

const call = (name: string) => blockEvent(raw, "agent", { id: "toolu_01", input: { title: "spike" }, name, type: "tool_use" }, undefined);

describe("a tool call is named in neutral words", () => {
	it("a tool this record serves drops the server claude saw it on and is marked as ours", () => {
		expect(call("mcp__antumbra__land_report")).toEqual({
			input: '{"title":"spike"}',
			name: "land_report",
			providerName: "mcp__antumbra__land_report",
			raw,
			servedBy: "antumbra",
			toolId: "toolu_01",
			type: "tool.started",
		});
	});

	it("another server's tool keeps its server in front, readably, and is not ours", () => {
		const event = call("mcp__playwright__browser_click");
		expect(event).toMatchObject({
			name: "playwright: browser_click",
			providerName: "mcp__playwright__browser_click",
		});
		expect(event).not.toHaveProperty("servedBy");
	});

	it("claude's own tools are named as claude names them, with nothing beside", () => {
		const event = call("Bash");
		expect(event).toMatchObject({ name: "Bash" });
		expect(event).not.toHaveProperty("providerName");
		expect(event).not.toHaveProperty("servedBy");
	});
});
