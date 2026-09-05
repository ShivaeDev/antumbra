import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { activate } from "#agent-birth/activate.ts";
import { deliverCharter } from "#agent-birth/deliver-charter.ts";
import { isActivated } from "#agent-birth/is-activated.ts";
import { prepareMoorage } from "#agent-birth/prepare-moorage.ts";
import { reserve } from "#agent-birth/reserve.ts";
import { settleFailure } from "#agent-birth/settle-failure.ts";

export const AgentBirth = defineService({
	id: "@antumbra/domain/AgentBirth",
	requires: [Database, Boards, DomainFeeds, SessionFabric, Repos],
	initialize: Effect.void,
	methods: () => ({ reserve, activate, settleFailure, isActivated, deliverCharter, prepareMoorage }),
});
