import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { SessionFabric } from "@antumbra/session-fabric";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { activate } from "#agent-birth/activate.ts";
import { deliverCharter } from "#agent-birth/deliver-charter.ts";
import { isActivated } from "#agent-birth/is-activated.ts";
import { markMoorageReady } from "#agent-birth/mark-moorage-ready.ts";
import { prepareMoorage } from "#agent-birth/prepare-moorage.ts";
import { register } from "#agent-birth/register.ts";
import { settleFailure } from "#agent-birth/settle-failure.ts";

export const AgentBirth = defineService({
	id: "@antumbra/domain/AgentBirth",
	requires: [Database, Boards, DomainFeeds, SessionFabric, Repos, Pieces, Voyages],
	initialize: Effect.void,
	methods: () => ({ register, activate, settleFailure, isActivated, deliverCharter, prepareMoorage, markMoorageReady }),
});
