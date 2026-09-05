export const FLEET_SCOPE = "fleet";

export interface AgentSettingsChoice {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
}

export const UNCHOSEN: AgentSettingsChoice = { backend: null, effort: null, model: null };

export interface ResolvedAgentSettings {
	readonly backend: string;
	readonly effort?: string;
	readonly model?: string;
}
