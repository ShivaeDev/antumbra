import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { activate } from "#agent-birth/activate.ts";
import { reserve } from "#agent-birth/reserve.ts";
import { settleFailure } from "#agent-birth/settle-failure.ts";

export const AgentBirth = defineService({
	id: "@antumbra/domain/AgentBirth",
	requires: [Database, Boards, DomainFeeds, SessionFabric],
	initialize: Effect.void,
	methods: () => ({ reserve, activate, settleFailure }),
});
