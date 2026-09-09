import type { backends } from "@antumbra/backends/feature.ts";
import { BackendCatalog } from "@antumbra/domain/backend-catalog/service";
import type { ModelChoice } from "@antumbra/plugin-api";
import type { Api } from "@antumbra/rpc/client.ts";
import { AGENT_BACKEND_TAGS, type AgentBackendTag } from "@antumbra/vocabulary/agent-backend.ts";
import { type Context, Effect } from "effect";
import { ServerReach } from "#adapters/role-settings.ts";

type Reach<Failure> = Api<readonly [typeof backends], Failure>;

type Catalog = Effect.Success<typeof BackendCatalog>;

const offered = (choices: ReadonlyArray<ModelChoice>) =>
	choices.map((choice) => ({ efforts: choice.efforts, isDefault: choice.isDefault, model: choice.id, name: choice.name }));

const reported = <Failure>(reach: Reach<Failure>, catalog: Catalog, backend: AgentBackendTag) =>
	catalog.listModels(backend).pipe(
		Effect.matchEffect({
			onFailure: (failure) => reach.backends.listModels({ backend, failure: failure.message, models: [] }),
			onSuccess: (choices) => reach.backends.listModels({ backend, failure: null, models: offered(choices) }),
		}),
		Effect.catchCause((cause) => Effect.logError(`backends: the ${backend} catalogue did not reach the server`, cause)),
	);

export const reportModelsOver = <Failure>(reach: Reach<Failure>, catalog: Catalog): Effect.Effect<void> =>
	Effect.flatMap(catalog.snapshot(), ({ backends: registered }) =>
		Effect.forEach(
			AGENT_BACKEND_TAGS.filter((tag) => registered.includes(tag)),
			(tag) => reported(reach, catalog, tag),
			{ concurrency: "unbounded", discard: true },
		),
	);

export const reportModels: Effect.Effect<void, never, Context.Service.Identifier<typeof BackendCatalog> | ServerReach> = Effect.gen(function* () {
	yield* reportModelsOver(yield* ServerReach, yield* BackendCatalog);
});
