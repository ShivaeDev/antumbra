import { type AgentRole, type AgentSettingsChoice, type RoleSettings, UNCHOSEN_AGENT_SETTINGS } from "@antumbra/contract";
import { Schema } from "effect";

export const roleDraftSchema = Schema.Struct({ backend: Schema.String, effort: Schema.String, model: Schema.String });
export type RoleDraft = typeof roleDraftSchema.Type;

export interface RolePlaceholder {
	readonly backend: string;
	readonly effort: string;
	readonly model: string;
}

export const BACKEND_OWN = "the backend's own";

export const EMPTY_DRAFT: RoleDraft = { backend: "", effort: "", model: "" };

export const EMPTY_PLACEHOLDER: RolePlaceholder = { backend: "", effort: BACKEND_OWN, model: BACKEND_OWN };

const named = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export const chosenOf = (draft: RoleDraft): AgentSettingsChoice => ({
	backend: named(draft.backend),
	effort: named(draft.effort),
	model: named(draft.model),
});

export const roleDefault = (defaults: ReadonlyArray<RoleSettings>, role: AgentRole): AgentSettingsChoice =>
	defaults.find((row) => row.role === role) ?? UNCHOSEN_AGENT_SETTINGS;

export const voyagePlaceholder = (backends: ReadonlyArray<string>, fleetDefault: AgentSettingsChoice, backend: string): RolePlaceholder => {
	const inherited = fleetDefault.backend ?? backends[0] ?? "";
	const sails = backend === "" || backend === inherited;
	return {
		backend: inherited,
		effort: (sails ? fleetDefault.effort : null) ?? BACKEND_OWN,
		model: (sails ? fleetDefault.model : null) ?? BACKEND_OWN,
	};
};
