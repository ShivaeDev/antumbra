import type { ModelChoice } from "@antumbra/platform-runner/catalog.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Registration } from "@antumbra/platform-runner/log.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { make, Request } from "@antumbra/platform-vocabulary/id.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { Effect } from "effect";

const catalogued = (model: typeof ModelChoice.Type) => ({
	model: model.id,
	name: model.name,
	defaultEffort: model.defaultEffort,
	efforts: model.efforts,
	isDefault: model.isDefault,
});

export const reportModels = Effect.fn("Backends.reportModels")(function* (registration: Registration) {
	const runners = yield* RunnerOperations;

	yield* Effect.forEach(
		AGENT_BACKEND_TAGS.filter((backend) => registration.backends.includes(backend)),
		(backend) =>
			Effect.gen(function* () {
				const backendsService = yield* Backends;

				const requestId = make();
				const result = yield* runners.execute(registration.runnerId, { type: "ListModels", requestId, backend });
				if (result.type !== "ModelsListed" && result.type !== "Refused") return yield* Effect.die(result);
				const failure = result.type === "Refused" ? result.reason : result.failure;
				const models = result.type === "Refused" ? [] : result.models.map(catalogued);
				yield* backendsService.listModels({ requestId: Request.make(`models:${requestId}`), backend, failure, models }).pipe(Effect.orDie);
			}),
		{ concurrency: "unbounded", discard: true },
	);
});
