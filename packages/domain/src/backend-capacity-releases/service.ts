import { Kernel } from "@antumbra/kernel";
import { BackendCapacities } from "@antumbra/provider-capacity";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { AgentDomain } from "#agent-domain-service.ts";
import { initialize } from "#backend-capacity-releases/initialize.ts";
import { release } from "#backend-capacity-releases/release.ts";

export const BackendCapacityReleases = defineService({
	id: "@antumbra/domain/BackendCapacityReleases",
	initialize: initialize,
	methods: (reconcile) => ({ release: release(reconcile) }),
	requires: [AgentDomain, Kernel, BackendCapacities],
});
