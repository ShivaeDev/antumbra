import type { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Context, type Effect, Schema } from "effect";

export class BirthHeld extends Schema.TaggedError<BirthHeld>()("BirthHeld", { reason: Schema.String }) {}

export class Provisioning extends Context.Service<
	Provisioning,
	{
		readonly prepare: (agentId: AgentId, requestId: Request, runnerId: string) => Effect.Effect<string, BirthHeld>;
	}
>()("@antumbra/domain-agents/provisioning") {}
