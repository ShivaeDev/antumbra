import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { listModels } from "#backend-catalog/list-models.ts";
import { BackendProviders } from "#backend-catalog/providers.ts";
import { snapshot } from "#backend-catalog/snapshot.ts";

export const BackendCatalog = defineService({
	id: "@antumbra/domain/BackendCatalog",
	initialize: Effect.void,
	methods: () => ({ listModels, snapshot }),
	requires: [BackendProviders],
});
