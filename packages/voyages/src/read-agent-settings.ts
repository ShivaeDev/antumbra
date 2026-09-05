import { Database } from "@antumbra/persistence";
import type { VoyageAgentRole } from "@antumbra/vocabulary/voyage";
import { Effect, Option } from "effect";
import { agentSettingsOf } from "#agent-settings.ts";

export const readAgentSettings = Effect.fn("Voyages.readAgentSettings")(function* (voyageId: string, role: VoyageAgentRole) {
	const db = yield* Database;
	const voyage = yield* db.Voyage.where({ id: voyageId }).first();
	return Option.isSome(voyage) ? agentSettingsOf(voyage.value, role) : {};
});
