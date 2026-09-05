import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import type { Context } from "effect";
import { announceCapacity } from "#announce.ts";
import { clearCapacity } from "#clear.ts";
import { currentCapacity } from "#current.ts";
import { initializeCapacity } from "#initialize.ts";
import { capacitySnapshot } from "#snapshot.ts";
import { CapacitySources } from "#sources.ts";

export const BackendCapacities = defineService({
	id: "@antumbra/provider-capacity/BackendCapacities",
	initialize: initializeCapacity,
	methods: (writes) => ({
		announce: announceCapacity,
		clear: clearCapacity(writes),
		current: currentCapacity(writes),
		snapshot: capacitySnapshot(writes),
	}),
	requires: [Database, DomainFeeds, CapacitySources],
});
export type BackendCapacityService = Context.Service.Shape<typeof BackendCapacities>;
