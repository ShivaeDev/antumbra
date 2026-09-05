import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { drainSessions } from "#shutdown/drain.ts";

export const SessionShutdown = defineService({
	id: "@antumbra/domain/SessionShutdown",
	initialize: Effect.void,
	methods: () => ({ drain: drainSessions }),
	requires: [Database, AgentDomain, SessionFabric, DomainFeeds, Kernel],
});
