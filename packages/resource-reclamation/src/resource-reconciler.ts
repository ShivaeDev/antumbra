import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { HeldResourceRead } from "#held-resource-read.ts";
import { initializeResourceReconciler } from "#initialize-resource-reconciler.ts";
import { reconcile } from "#reconcile.ts";
import { makeRequest } from "#request.ts";
import { ResourceReclaimRunners } from "#resource-reclaim-runners.ts";
import { ResourceReconcilerOptions } from "#resource-reconciler-options.ts";

export const ResourceReconciler = defineService({
	id: "@antumbra/resource-reclamation/ResourceReconciler",
	initialize: initializeResourceReconciler,
	methods: (tick) => ({ reconcile, request: makeRequest(tick) }),
	requires: [Database, DomainFeeds, HeldResourceRead, ResourceReclaimRunners, ResourceReconcilerOptions],
});
