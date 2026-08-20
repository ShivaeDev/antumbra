import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "vitest";
import { openSessionMapping } from "#mapping.ts";

const AGENT_CALL = "toolu_01FXPFYypQqTefL5KPsKV8ww";

// why: a real capture — an oversized command output reaches the stream as a
// short preview while the provider keeps the full bytes on disk beside the
// session. The tool result itself says where they went.
const spilled = (parent: string | null): SDKUserMessage => ({
	message: {
		content: [
			{
				content: "the first 2kB",
				tool_use_id: "toolu_09",
				type: "tool_result",
			},
		],
		role: "user",
	},
	parent_tool_use_id: parent,
	tool_use_result: {
		persistedOutputPath: "/tmp/tool-results/toolu_09.txt",
		persistedOutputSize: 148_402,
		stdout: "the first 2kB",
	},
	type: "user",
});

it("says where a tool result spilled, on the node that produced it", () => {
	expect(openSessionMapping()(spilled(AGENT_CALL))).toMatchObject([
		{ origin: { spawnedBy: AGENT_CALL }, type: "tool.completed" },
		{
			detail:
				"full tool output spilled to /tmp/tool-results/toolu_09.txt (148402 bytes)",
			gapKind: "spilled-preview",
			origin: { spawnedBy: AGENT_CALL },
			type: "subsession.gap",
		},
	]);
});

it("a result that fitted inline leaves no gap behind", () => {
	const inline: SDKUserMessage = {
		...spilled(null),
		tool_use_result: { stdout: "sounded" },
	};
	expect(openSessionMapping()(inline)).toMatchObject([
		{ type: "tool.completed" },
	]);
});
