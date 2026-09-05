import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { standDown } from "#stand-down/stand-down.ts";

export const SessionStandDown = defineService({
	id: "@antumbra/sessions/SessionStandDown",
	initialize: Effect.void,
	methods: () => ({ standDown }),
	requires: [Database, SessionFabric, DomainFeeds],
});

export const SessionStandDownLive = SessionStandDown.layer;
