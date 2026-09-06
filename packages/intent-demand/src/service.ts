import { defineService } from "@antumbra/service-definition/define-service.ts";
import type { Context } from "effect";
import { makeHealth } from "#health.ts";
import { initializeIntentDemand } from "#initialize.ts";
import { Registrations } from "#registrations.ts";
import { makeRequest } from "#request.ts";

export const IntentDemand = defineService({
	id: "@antumbra/intent-demand/IntentDemand",
	initialize: initializeIntentDemand,
	methods: ({ health, tick }) => ({ health: makeHealth(health), request: makeRequest(tick) }),
	requires: [Registrations],
});

export type IntentDemand = Context.Service.Identifier<typeof IntentDemand>;
