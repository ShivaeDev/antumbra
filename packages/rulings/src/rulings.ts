import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { addContext } from "#add-context.ts";
import { awaitingAscent } from "#awaiting-ascent.ts";
import { awaitingDelivery } from "#awaiting-delivery.ts";
import { binding } from "#binding.ts";
import { frontier } from "#frontier.ts";
import { gate } from "#gate.ts";
import { get } from "#get.ts";
import { markDelivered } from "#mark-delivered.ts";
import { open } from "#open.ts";
import { openGates } from "#open-gates.ts";
import { openGatesForPieces } from "#open-gates-for-pieces.ts";
import { park } from "#park.ts";
import { passUp } from "#pass-up.ts";
import { proclaim } from "#proclaim.ts";
import { reclassify } from "#reclassify.ts";
import { request } from "#request.ts";
import { rule } from "#rule.ts";
import { standing } from "#standing.ts";
import { supersede } from "#supersede.ts";
import { withdraw } from "#withdraw.ts";

const requirements = [Database, DomainFeeds] as const;

export const Rulings = defineService({
	id: "@antumbra/rulings/Rulings",
	initialize: Effect.void,
	methods: () => ({
		addContext,
		awaitingAscent,
		awaitingDelivery,
		binding,
		frontier,
		gate,
		get,
		markDelivered,
		open,
		openGates,
		openGatesForPieces,
		park,
		passUp,
		proclaim,
		reclassify,
		request,
		rule,
		standing,
		supersede,
		withdraw,
	}),
	requires: requirements,
});

export const RulingsLive = Rulings.layer;
