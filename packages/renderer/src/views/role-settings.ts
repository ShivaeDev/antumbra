import { type AgentRole, type AgentSettingsChoice, type RoleSettings, UNCHOSEN_AGENT_SETTINGS } from "@antumbra/contract";

export interface RoleDraft {
	readonly backend: string;
	readonly effort: string;
	readonly model: string;
}

export interface RolePlaceholder {
	readonly backend: string;
	readonly effort: string;
	readonly model: string;
}

export interface RoleField<Role extends string = AgentRole> {
	readonly label: string;
	readonly placeholder: RolePlaceholder;
	readonly role: Role;
}

export interface RoleLine<Role extends string = AgentRole> extends RoleField<Role> {
	readonly settings: AgentSettingsChoice;
}

export const roleLabel: Record<AgentRole, string> = { captain: "Captain", crew: "Crew", flagship: "Flagship" };

export const BACKEND_OWN = "the backend's own";

export const EMPTY_DRAFT: RoleDraft = { backend: "", effort: "", model: "" };

const named = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export const draftOf = (settings: AgentSettingsChoice): RoleDraft => ({
	backend: settings.backend ?? "",
	effort: settings.effort ?? "",
	model: settings.model ?? "",
});

export const chosenOf = (draft: RoleDraft): AgentSettingsChoice => ({
	backend: named(draft.backend),
	effort: named(draft.effort),
	model: named(draft.model),
});

export const sameSettings = (left: AgentSettingsChoice, right: AgentSettingsChoice): boolean =>
	left.backend === right.backend && left.effort === right.effort && left.model === right.model;

export const roleDefault = (defaults: ReadonlyArray<RoleSettings>, role: AgentRole): AgentSettingsChoice =>
	defaults.find((row) => row.role === role) ?? UNCHOSEN_AGENT_SETTINGS;

export const fleetPlaceholder = (backends: ReadonlyArray<string>): RolePlaceholder => ({
	backend: backends[0] ?? "",
	effort: BACKEND_OWN,
	model: BACKEND_OWN,
});

export const voyagePlaceholder = (backends: ReadonlyArray<string>, fleetDefault: AgentSettingsChoice): RolePlaceholder => ({
	backend: fleetDefault.backend ?? backends[0] ?? "",
	effort: fleetDefault.effort ?? BACKEND_OWN,
	model: fleetDefault.model ?? BACKEND_OWN,
});

export const signatureOf = (lines: ReadonlyArray<RoleLine<string>>): string =>
	lines.map((line) => [line.role, line.settings.backend, line.settings.model, line.settings.effort].join(":")).join("|");
