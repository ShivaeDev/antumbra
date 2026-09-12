import { port } from "@antumbra/platform-feature/port.ts";
import type { ToolDescriptor, ToolSet } from "@antumbra/platform-vocabulary/tool-set.ts";
import type { VoyageKind } from "@antumbra/platform-vocabulary/voyage.ts";
import type { Effect } from "effect";

export class ToolCatalog extends port<
	ToolCatalog,
	{
		readonly freeze: (role: string, voyageKind: VoyageKind | null) => Effect.Effect<ToolSet>;
		readonly byVersion: (version: string) => Effect.Effect<readonly ToolDescriptor[]>;
	}
>()("toolCatalog") {}
