import { it } from "@antumbra/app-testing/entry.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { reportModels } from "#backends/report.ts";

const registration = { runnerId: "runner", logId: "log", backends: ["codex"], imageInputBackends: ["codex"] };

it.app("runner model discovery supplies persisted model and effort pickers", function* () {
	const backendsService = yield* Backends;

	yield* reportModels(registration).pipe(
		Effect.provideService(RunnerOperations, {
			connected: Effect.succeed([]),
			execute: (runnerId, operation) => {
				expect(runnerId).toBe("runner");
				expect(operation).toMatchObject({ type: "ListModels", backend: "codex" });
				return Effect.succeed({
					type: "ModelsListed",
					backend: "codex",
					failure: null,
					models: [{ id: "test-model", name: "Test Model", isDefault: true, defaultEffort: "high", efforts: ["medium", "high"] }],
				});
			},
		}),
	);
	expect(yield* backendsService.models({ backend: "codex" }).pipe(Effect.orDie)).toEqual([
		expect.objectContaining({ model: "test-model", name: "Test Model", isDefault: true, defaultEffort: "high", efforts: ["medium", "high"] }),
	]);
	expect(yield* backendsService.efforts({ backend: "codex", model: "test-model" }).pipe(Effect.orDie)).toEqual(["medium", "high"]);
});

it.app("provider discovery failures remain visible in the persisted catalog", function* () {
	const backendsService = yield* Backends;

	yield* reportModels(registration).pipe(
		Effect.provideService(RunnerOperations, {
			connected: Effect.succeed([]),
			execute: () => Effect.succeed({ type: "ModelsListed", backend: "codex", failure: "Sign in to list models", models: [] }),
		}),
	);
	expect(yield* backendsService.catalog({ backend: "codex" }).pipe(Effect.orDie)).toMatchObject({ failure: "Sign in to list models" });
	expect(yield* backendsService.models({ backend: "codex" }).pipe(Effect.orDie)).toEqual([]);
});
