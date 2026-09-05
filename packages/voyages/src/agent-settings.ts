import type { StoredVoyage } from "@antumbra/persistence";
import type { VoyageAgentRole } from "@antumbra/vocabulary/voyage";

export interface AgentSettings {
	readonly effort?: string;
	readonly model?: string;
}

type SettingsRow = Pick<StoredVoyage, "captainEffort" | "captainModel" | "crewEffort" | "crewModel">;

const chosen = (model: string | null, effort: string | null): AgentSettings => ({
	...(effort === null ? {} : { effort }),
	...(model === null ? {} : { model }),
});

export const agentSettingsOf = (voyage: SettingsRow, role: VoyageAgentRole): AgentSettings =>
	role === "captain" ? chosen(voyage.captainModel, voyage.captainEffort) : chosen(voyage.crewModel, voyage.crewEffort);
