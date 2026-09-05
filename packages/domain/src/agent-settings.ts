import type { VoyageAgentRole } from "@antumbra/vocabulary/voyage";
import type { VoyageRow } from "#voyage-rows.ts";

export interface AgentSettings {
	readonly effort?: string;
	readonly model?: string;
}

type SettingsRow = Pick<VoyageRow, "captainEffort" | "captainModel" | "crewEffort" | "crewModel">;

const chosen = (model: string | null, effort: string | null): AgentSettings => ({
	...(effort === null ? {} : { effort }),
	...(model === null ? {} : { model }),
});

export const agentSettingsOf = (voyage: SettingsRow, role: VoyageAgentRole): AgentSettings =>
	role === "captain" ? chosen(voyage.captainModel, voyage.captainEffort) : chosen(voyage.crewModel, voyage.crewEffort);
