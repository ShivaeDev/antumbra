import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { create } from "#turn-rest/create.ts";

export const SessionTurnRests = defineService({
	id: "@antumbra/sessions/SessionTurnRests",
	initialize: Effect.void,
	methods: () => ({ create }),
	requires: [Database, SessionFabric, DomainFeeds],
});
