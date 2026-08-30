import { defineService } from "@antumbra/service-definition";
import { makeBegan } from "#live-delegations/began.ts";
import { makeDelegating } from "#live-delegations/delegating.ts";
import { makeEnded } from "#live-delegations/ended.ts";
import { initializeLiveDelegations } from "#live-delegations/initialize.ts";
import { makeReleased } from "#live-delegations/released.ts";

// why: which roots have a child at work right now — never which have a child
// whose row is merely open. It is memory on purpose, the way the attachment set
// is: a node is only ever reachable through the stream that opened it, so an
// acquisition that is gone can never carry another frame of its children's
// work. A restart therefore starts it empty, and the census a reattach takes is
// what fills it in again from the provider's own word about which children are
// running — the one account of them that outlives a stream.
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
