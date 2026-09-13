import { it } from "@antumbra/app-testing/entry.ts";
import { catalog } from "@antumbra/domain-backends/queries/catalog.ts";
import { efforts } from "@antumbra/domain-backends/queries/efforts.ts";
import { models } from "@antumbra/domain-backends/queries/models.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { reportModels } from "#backends/report.ts";

const registration = { runnerId: "runner", logId: "log", backends: ["codex"], imageInputBackends: ["codex"] };

it.app("runner model discovery supplies persisted model and effort pickers", function* () {
	const live = yield* Live;
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
	expect(yield* live.read(models, { backend: "codex" })).toEqual([
		expect.objectContaining({ model: "test-model", name: "Test Model", isDefault: true, defaultEffort: "high", efforts: ["medium", "high"] }),
	]);
	expect(yield* live.read(efforts, { backend: "codex", model: "test-model" })).toEqual(["medium", "high"]);
});

it.app("provider discovery failures remain visible in the persisted catalog", function* () {
	const live = yield* Live;
	yield* reportModels(registration).pipe(
		Effect.provideService(RunnerOperations, {
			connected: Effect.succeed([]),
			execute: () => Effect.succeed({ type: "ModelsListed", backend: "codex", failure: "Sign in to list models", models: [] }),
		}),
	);
	expect(yield* live.read(catalog, { backend: "codex" })).toMatchObject({ failure: "Sign in to list models" });
	expect(yield* live.read(models, { backend: "codex" })).toEqual([]);
});
