import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { smootherWords } from "@antumbra/prompts";
import { Voyages } from "@antumbra/voyages";
import { Effect, Option } from "effect";
import { SMOOTHER_ROLE } from "#smoothing/fields.ts";

export const ensureAgent = Effect.fn("SmootherLifecycle.ensureAgent")(function* (voyageId: string) {
	const boards = yield* Boards;
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const voyages = yield* Voyages;
	const crewed = yield* db.VoyageAgent.where({ role: SMOOTHER_ROLE, voyageId }).first();
	if (Option.isSome(crewed)) return crewed.value.agentId;
	const agentId = crypto.randomUUID();
	yield* db.Agent.create({
		charter: smootherWords,
		currentSessionId: null,
		id: agentId,
		role: SMOOTHER_ROLE,
		status: "alive",
	});
	yield* boards.ensure(BoardScope.Agent({ agentId }));
	yield* voyages.assignAgent(voyageId, agentId, SMOOTHER_ROLE);
	yield* feeds.publishFleetRefresh();
	return agentId;
});
