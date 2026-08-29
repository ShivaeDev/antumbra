import { defineService } from "@antumbra/service-definition";
import { makeHolding } from "#ruling-holds/holding.ts";
import { initializeRulingHolds } from "#ruling-holds/initialize.ts";
import { makeIsHeld } from "#ruling-holds/is-held.ts";

// why: whether an asker is still on the line is a fact about this host, never
// about the record — so the set is memory on purpose. A restart forgets every
// hold, which is the right answer: the process that was holding is gone, and
// the durable mark of delivery is the only thing that outlives it.
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
