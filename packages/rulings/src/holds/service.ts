import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { makeAddContextAndHold } from "#holds/add-context-and-hold.ts";
import { initializeRulingHolds } from "#holds/initialize.ts";
import { makeIsHeld } from "#holds/is-held.ts";
import { makeRequestAndHold } from "#holds/request-and-hold.ts";
import { Rulings } from "#rulings.ts";

export const RulingHolds = defineService({
	id: "@antumbra/domain/RulingHolds",
	initialize: initializeRulingHolds,
	methods: (held) => ({
		addContextAndHold: makeAddContextAndHold(held),
		requestAndHold: makeRequestAndHold(held),
		isHeld: makeIsHeld(held),
	}),
	requires: [Rulings, DomainFeeds],
});

export const RulingHoldsLive = RulingHolds.layer;
