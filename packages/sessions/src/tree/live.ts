import { defineService } from "@antumbra/service-definition";
import { makeBegan } from "#live-delegations/began.ts";
import { makeDelegating } from "#live-delegations/delegating.ts";
import { makeEnded } from "#live-delegations/ended.ts";
import { initializeLiveDelegations } from "#live-delegations/initialize.ts";
import { makeReleased } from "#live-delegations/released.ts";

// This registry tracks current acquisitions; reconnect repopulates it from provider census.
export const LiveDelegations = defineService({
	id: "@antumbra/sessions/LiveDelegations",
	initialize: initializeLiveDelegations,
	methods: (open) => ({
		began: makeBegan(open),
		delegating: makeDelegating(open),
		ended: makeEnded(open),
		released: makeReleased(open),
	}),
	requires: [],
});

export const LiveDelegationsLive = LiveDelegations.layer;
