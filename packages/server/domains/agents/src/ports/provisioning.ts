import { port } from "@antumbra/platform-feature/port.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { type Effect, Schema } from "effect";
import type { AgentId } from "#ids.ts";

export class BirthHeld extends Schema.TaggedError<BirthHeld>()("BirthHeld", { reason: Schema.String }) {}

export class Provisioning extends port<
	Provisioning,
	{
		readonly prepare: (agentId: AgentId, requestId: Request, runnerId: string) => Effect.Effect<string, BirthHeld>;
	}
>()("provisioning") {}
