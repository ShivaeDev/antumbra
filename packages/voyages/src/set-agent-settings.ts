import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { VoyageAgentRole } from "@antumbra/vocabulary/voyage";
import { Effect } from "effect";
import { verifyExists } from "#verify-exists.ts";

export interface AgentSettingsChoice {
	readonly effort: string | null;
	readonly model: string | null;
}

export const setAgentSettings = Effect.fn("Voyages.setAgentSettings")(function* (
	voyageId: string,
	role: VoyageAgentRole,
	choice: AgentSettingsChoice,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	yield* verifyExists(voyageId);
	const voyage = db.Voyage.where({ id: voyageId });
	yield* role === "captain"
		? voyage.update({ captainEffort: choice.effort, captainModel: choice.model })
		: voyage.update({ crewEffort: choice.effort, crewModel: choice.model });
	yield* feeds.publishVoyageRefresh();
});
