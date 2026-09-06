import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { isFlagshipCaptain } from "#authority/flagship-captain.ts";
import { rulesAs } from "#authority/rules-as.ts";
import { rungAsked } from "#authority/rung-asked.ts";

export const VoyageAuthority = defineService({
	id: "@antumbra/voyages/VoyageAuthority",
	initialize: Effect.void,
	methods: () => ({ isFlagshipCaptain, rungAsked, rulesAs }),
	requires: [Database],
});
