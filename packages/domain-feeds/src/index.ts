import { defineService } from "@antumbra/service-definition";
import type { Context } from "effect";
import { makePublishChangeRefresh } from "#publish-change-refresh.ts";
import { makePublishFleetRefresh } from "#publish-fleet-refresh.ts";
import { makePublishResourceReclaim } from "#publish-resource-reclaim.ts";
import { makePublishSessionEvent } from "#publish-session-event.ts";
import { makePublishVoyageRefresh } from "#publish-voyage-refresh.ts";
import { initializeDomainFeeds } from "#state.ts";
import { makeSubscribeChangeRefresh } from "#subscribe-change-refresh.ts";
import { makeSubscribeFleetRefresh } from "#subscribe-fleet-refresh.ts";
import { makeSubscribeResourceReclaim } from "#subscribe-resource-reclaim.ts";
import { makeSubscribeSessionEvents } from "#subscribe-session-events.ts";
import { makeSubscribeVoyageRefresh } from "#subscribe-voyage-refresh.ts";

// why: the log is the single truth. Feeds carry notifications beside writes,
// so missing one only loses latency: subscribers rehydrate and deduplicate.
export const DomainFeeds = defineService({
	id: "@antumbra/domain-feeds/DomainFeeds",
	initialize: initializeDomainFeeds,
	methods: (feeds) => ({
		publishChangeRefresh: makePublishChangeRefresh(feeds.changeRefresh),
		publishFleetRefresh: makePublishFleetRefresh(feeds.fleet),
		publishResourceReclaim: makePublishResourceReclaim(feeds.resourceReclaim),
		publishSessionEvent: makePublishSessionEvent(feeds.events),
		publishVoyageRefresh: makePublishVoyageRefresh(feeds.voyages),
		subscribeChangeRefresh: makeSubscribeChangeRefresh(feeds.changeRefresh),
		subscribeFleetRefresh: makeSubscribeFleetRefresh(feeds.fleet),
		subscribeResourceReclaim: makeSubscribeResourceReclaim(
			feeds.resourceReclaim,
		),
		subscribeSessionEvents: makeSubscribeSessionEvents(feeds.events),
		subscribeVoyageRefresh: makeSubscribeVoyageRefresh(feeds.voyages),
	}),
	requires: [],
});

export type DomainFeedsService = Context.Service.Shape<typeof DomainFeeds>;

export const DomainFeedsLive = DomainFeeds.layer;

export type { StoredEvent } from "#stored-event.ts";
