import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import type { ToolDescriptor } from "@antumbra/platform-vocabulary/tool-set.ts";
import type { VoyageKind } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect, Layer } from "effect";
import { toolSets } from "#tools/catalog.ts";

const specs = new Map<string, readonly ToolDescriptor[]>(
	Object.entries(toolSets).map(([version, tools]) => [version, tools.map((tool) => tool.spec)]),
);

const versionOf = (role: string, voyageKind: VoyageKind | null): keyof typeof toolSets => {
	if (role === "smoother") return "smoothing-v1";
	if (role !== "captain" || voyageKind === null) return "crew-v1";
	return voyageKind === "flagship" ? "flagship-v1" : "captain-v1";
};

export const toolCatalog = Layer.succeed(ToolCatalog, {
	byVersion: (version: string) => Effect.succeed(specs.get(version) ?? []),
	freeze: (role: string, voyageKind: VoyageKind | null) => {
		const version = versionOf(role, voyageKind);
		return Effect.succeed({ version, tools: specs.get(version) ?? [] });
	},
});
