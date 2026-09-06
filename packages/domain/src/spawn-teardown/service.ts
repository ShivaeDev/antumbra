import { Database } from "@antumbra/persistence";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { AgentBirth } from "#agent-birth/service.ts";
import { afterFailure } from "#spawn-teardown/after-failure.ts";
import { cancellation } from "#spawn-teardown/cancellation.ts";
import { unlessTeardown } from "#spawn-teardown/unless-teardown.ts";

export const SpawnTeardown = defineService({
	id: "@antumbra/domain/SpawnTeardown",
	initialize: Effect.void,
	methods: () => ({ afterFailure, cancellation, unlessTeardown }),
	requires: [Database, AgentBirth, ResourceReconciler],
});
