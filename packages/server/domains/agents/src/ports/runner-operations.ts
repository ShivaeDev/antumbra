import { port } from "@antumbra/platform-feature/port.ts";
import { ToolSet } from "@antumbra/platform-vocabulary/tool-set.ts";
import { type Effect, Schema } from "effect";

export const StartOrder = Schema.Struct({
	requestId: Schema.String,
	sessionId: Schema.String,
	agentId: Schema.String,
	backend: Schema.String,
	cwd: Schema.String,
	model: Schema.NullOr(Schema.String),
	effort: Schema.NullOr(Schema.String),
	constrainedPrompt: Schema.NullOr(Schema.String),
	toolSet: ToolSet,
	charterId: Schema.String,
	charter: Schema.String,
});
export type StartOrder = typeof StartOrder.Type;

export class RunnerOperations extends port<
	RunnerOperations,
	{
		readonly runnerFor: (backend: string) => Effect.Effect<string>;
		readonly start: (runnerId: string, order: StartOrder) => Effect.Effect<string | null>;
	}
>()("runnerOperations") {}
