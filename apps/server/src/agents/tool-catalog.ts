import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import type { ToolDescriptor } from "@antumbra/platform-vocabulary/tool-set.ts";
import { Effect, Layer } from "effect";
import { toolSets } from "#tools/catalog.ts";

const specs = new Map<string, readonly ToolDescriptor[]>(
	Object.entries(toolSets).map(([version, tools]) => [version, tools.map((tool) => tool.spec)]),
);

const VERSIONS: Record<AgentRole, keyof typeof toolSets> = {
	smoother: "smoothing-v1",
	crew: "crew-v1",
	captain: "captain-v1",
	flagship: "flagship-v1",
};

export const toolCatalog = Layer.succeed(ToolCatalog, {
	byVersion: (version: string) => Effect.succeed(specs.get(version) ?? []),
	freeze: (role: AgentRole) => {
		const version = VERSIONS[role];
		return Effect.succeed({ version, tools: specs.get(version) ?? [] });
	},
});
