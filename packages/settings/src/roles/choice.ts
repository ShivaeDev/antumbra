import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";

export const FLEET_SCOPE = "fleet";

export interface AgentSettingsChoice {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
}

export const UNCHOSEN: AgentSettingsChoice = { backend: null, effort: null, model: null };

export interface RoleDefault extends AgentSettingsChoice {
	readonly role: AgentRole;
}

export interface VoyageAgentSettings {
	readonly captain: AgentSettingsChoice;
	readonly crew: AgentSettingsChoice;
}

export interface ResolvedAgentSettings {
	readonly backend: string;
	readonly effort?: string;
	readonly model?: string;
}
