import { defineService } from "@antumbra/service-definition";
import { makeHolding } from "#ruling-holds/holding.ts";
import { initializeRulingHolds } from "#ruling-holds/initialize.ts";
import { makeIsHeld } from "#ruling-holds/is-held.ts";

export const RulingHolds = defineService({
	id: "@antumbra/domain/RulingHolds",
	initialize: initializeRulingHolds,
	methods: (held) => ({
		holding: makeHolding(held),
		isHeld: makeIsHeld(held),
	}),
	requires: [],
});

export const RulingHoldsLive = RulingHolds.layer;
