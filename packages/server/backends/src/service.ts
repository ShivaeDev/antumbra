import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { listModels } from "#commands/list-models.ts";
import { observeCapability } from "#commands/observe-capability.ts";
import { initialize } from "#initialize.ts";
import { catalog } from "#queries/catalog.ts";
import { efforts } from "#queries/efforts.ts";
import { models } from "#queries/models.ts";
export const Backends = defineService({
	id: "@antumbra/server-backends/Backends",
	requires: [BackendsHistory],
	initialize: initialize,
	methods: (serial) => ({
		listModels: listModels(serial),
		observeCapability: observeCapability(serial),
		models,
		efforts,
		catalog,
	}),
});
