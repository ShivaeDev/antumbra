import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import type { ToolDescriptor, ToolSet } from "@antumbra/platform-vocabulary/tool-set.ts";
import type { Effect } from "effect";
import { Context } from "effect";

export class ToolCatalog extends Context.Service<
	ToolCatalog,
	{
		readonly freeze: (role: AgentRole) => Effect.Effect<ToolSet>;
		readonly byVersion: (version: string) => Effect.Effect<readonly ToolDescriptor[]>;
	}
>()("@antumbra/domain-agents/toolCatalog") {}
