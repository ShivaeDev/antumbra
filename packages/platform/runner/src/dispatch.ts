import { Context, type Effect } from "effect";
import type { Registration } from "#log.ts";
import type { Operation, OperationResult } from "#operations.ts";

export class RunnerOperations extends Context.Service<
	RunnerOperations,
	{
		readonly connected: Effect.Effect<readonly Registration[]>;
		readonly execute: (runnerId: string, operation: Operation) => Effect.Effect<OperationResult>;
	}
>()("@antumbra/platform-runner/RunnerOperations") {}
