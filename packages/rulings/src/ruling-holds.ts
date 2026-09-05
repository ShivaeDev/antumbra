import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineService } from "@antumbra/service-definition";
import { initializeRulingHolds } from "#ruling-holds/initialize.ts";
import { makeIsHeld } from "#ruling-holds/is-held.ts";
import { makeRequestAndHold } from "#ruling-holds/request-and-hold.ts";
import { Rulings } from "#rulings.ts";

export const RulingHolds = defineService({
	id: "@antumbra/domain/RulingHolds",
	initialize: initializeRulingHolds,
	methods: (held) => ({
		requestAndHold: makeRequestAndHold(held),
		isHeld: makeIsHeld(held),
	}),
	requires: [Rulings, DomainFeeds],
});

export const RulingHoldsLive = RulingHolds.layer;
