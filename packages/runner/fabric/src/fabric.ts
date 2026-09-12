import { defineService } from "@antumbra/platform-service-definition/define-service.ts";
import { executing } from "#execute.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry, InputResolver, RunnerIdentity, ServerTools } from "#ports.ts";
import { attached, initialize } from "#state.ts";

export const RunnerFabric = defineService({
	id: "@antumbra/runner-fabric/RunnerFabric",
	initialize: initialize,
	methods: (state) => ({ execute: executing(state), attached: attached(state) }),
	requires: [RunnerLog, BackendRegistry, InputResolver, RunnerIdentity, ServerTools],
});
export const layer = RunnerFabric.layer;
