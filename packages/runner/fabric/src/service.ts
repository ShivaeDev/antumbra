import { defineService } from "@shivaedev/service/defineService.ts";
import { attached } from "#attached.ts";
import { execute } from "#execute.ts";
import { initialize } from "#initialize.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry, InputResolver, RunnerIdentity, ServerTools } from "#ports.ts";

export const RunnerFabric = defineService({
	id: "@antumbra/runner-fabric/RunnerFabric",
	initialize,
	methods: (state) => ({ attached: attached(state), execute: execute(state) }),
	requires: [RunnerLog, BackendRegistry, InputResolver, RunnerIdentity, ServerTools],
});
