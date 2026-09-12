import { port } from "@antumbra/platform-feature/port.ts";
import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import type { ToolDescriptor, ToolSet } from "@antumbra/platform-vocabulary/tool-set.ts";
import type { Effect } from "effect";

export class ToolCatalog extends port<
	ToolCatalog,
	{
		readonly freeze: (role: AgentRole) => Effect.Effect<ToolSet>;
		readonly byVersion: (version: string) => Effect.Effect<readonly ToolDescriptor[]>;
	}
>()("toolCatalog") {}
