import { port } from "@antumbra/platform-feature/port.ts";
import type { ToolSet } from "@antumbra/platform-vocabulary/tool-set.ts";
import type { Effect } from "effect";

export interface StartOrder {
	readonly requestId: string;
	readonly sessionId: string;
	readonly agentId: string;
	readonly backend: string;
	readonly cwd: string;
	readonly model: string | null;
	readonly effort: string | null;
	readonly constrainedPrompt: string | null;
	readonly toolSet: ToolSet;
	readonly charterId: string;
	readonly charter: string;
}

export class RunnerOperations extends port<
	RunnerOperations,
	{
		readonly runnerFor: (backend: string) => Effect.Effect<string>;
		readonly start: (runnerId: string, order: StartOrder) => Effect.Effect<string | null>;
	}
>()("runnerOperations") {}
