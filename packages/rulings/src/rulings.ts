import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { awaitingDelivery } from "#awaiting-delivery.ts";
import { get } from "#get.ts";
import { markDelivered } from "#mark-delivered.ts";
import { open } from "#open.ts";
import { request } from "#request.ts";
import { rule } from "#rule.ts";
import { standing } from "#standing.ts";

const requirements = [Database, DomainFeeds] as const;

// why: a Ruling is its own record beside the Board, so its writes, its answer,
// and its readings live in one capability that owns their transactions.
export const Rulings = defineService({
	id: "@antumbra/rulings/Rulings",
	initialize: Effect.void,
	methods: () => ({
		awaitingDelivery,
		get,
		markDelivered,
		open,
		request,
		rule,
		standing,
	}),
	requires: requirements,
});

export const RulingsLive = Rulings.layer;
