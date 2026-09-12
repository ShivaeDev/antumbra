import type { Operation, OperationResult } from "@antumbra/platform-runner/operations.ts";
import { BackendRegistry } from "@antumbra/runner-fabric/ports.ts";
import { Effect } from "effect";

export const listModels = Effect.fn("Runner.listModels")(function* (
	operation: Extract<Operation, { type: "ListModels" }>,
): Effect.fn.Return<OperationResult, never, BackendRegistry> {
	const registry = yield* BackendRegistry;
	const backend = registry.backends.get(operation.backend);
	if (backend === undefined) return { type: "ModelsListed", backend: operation.backend, models: [], failure: "backend is not registered" };
	return yield* backend.listModels.pipe(
		Effect.match({
			onFailure: (failure) => ({ type: "ModelsListed" as const, backend: operation.backend, models: [], failure: failure.message }),
			onSuccess: (models) => ({ type: "ModelsListed" as const, backend: operation.backend, models, failure: null }),
		}),
	);
});
