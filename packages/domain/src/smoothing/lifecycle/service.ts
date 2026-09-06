import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionRegistration } from "@antumbra/sessions/registration/service";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { closeSession } from "#smoothing/lifecycle/close-session.ts";
import { ensureAgent } from "#smoothing/lifecycle/ensure-agent.ts";
import { registerSession } from "#smoothing/lifecycle/register-session.ts";

export const SmootherLifecycle = defineService({
	id: "@antumbra/domain/SmootherLifecycle",
	initialize: Effect.void,
	methods: () => ({ ensureAgent, registerSession, closeSession }),
	requires: [Boards, Database, DomainFeeds, SessionFabric, SessionRegistration, Voyages],
});
