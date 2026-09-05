import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { markActive } from "#drain/mark-active.ts";

export const SessionDrain = defineService({
	id: "@antumbra/sessions/SessionDrain",
	requires: [Database, DomainFeeds, SessionFabric],
	initialize: Effect.void,
	methods: () => ({ markActive }),
});
