import { BackendsHistory } from "@antumbra/server-storage/backends/service.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { listModels } from "#commands/list-models.ts";
import { observeCapability } from "#commands/observe-capability.ts";
import { initialize } from "#initialize.ts";
import { catalog } from "#queries/catalog.ts";
import { efforts } from "#queries/efforts.ts";
import { models } from "#queries/models.ts";
export const Backends = defineService({
	id: "@antumbra/server-backends/Backends",
	requires: [ExecutionHistory, Records, BackendsHistory],
	initialize: initialize,
	methods: (serial) => ({
		listModels: listModels(serial),
		observeCapability: observeCapability(serial),
		models,
		efforts,
		catalog,
	}),
});
