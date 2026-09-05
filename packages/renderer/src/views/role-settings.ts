import {
	type AgentRole,
	type AgentSettingsChoice,
	type RoleSettings,
	UNCHOSEN_AGENT_SETTINGS,
	type VoyageAgentRole,
	type VoyageView,
} from "@antumbra/contract";
import { Schema } from "effect";

export const roleDraftSchema = Schema.Struct({ backend: Schema.String, effort: Schema.String, model: Schema.String });
export type RoleDraft = typeof roleDraftSchema.Type;

export interface RolePlaceholder {
	readonly backend: string;
	readonly effort: string;
	readonly model: string;
}

export const roleLabel: Record<AgentRole, string> = { captain: "Captain", crew: "Crew", flagship: "Flagship" };

export const BACKEND_OWN = "the backend's own";

export const EMPTY_DRAFT: RoleDraft = { backend: "", effort: "", model: "" };

export const EMPTY_PLACEHOLDER: RolePlaceholder = { backend: "", effort: BACKEND_OWN, model: BACKEND_OWN };

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

const sameSettings = (left: AgentSettingsChoice, right: AgentSettingsChoice): boolean =>
	left.backend === right.backend && left.effort === right.effort && left.model === right.model;

export const roleDefault = (defaults: ReadonlyArray<RoleSettings>, role: AgentRole): AgentSettingsChoice =>
	defaults.find((row) => row.role === role) ?? UNCHOSEN_AGENT_SETTINGS;

export const changedRoles = <Role extends string>(
	roles: ReadonlyArray<Role>,
	drafts: Readonly<Record<Role, RoleDraft>>,
	settingsOf: (role: Role) => AgentSettingsChoice,
): ReadonlyArray<Role> => roles.filter((role) => !sameSettings(chosenOf(drafts[role]), settingsOf(role)));

export const signatureOf = <Role extends string>(roles: ReadonlyArray<Role>, settingsOf: (role: Role) => AgentSettingsChoice): string =>
	roles.map((role) => [role, settingsOf(role).backend, settingsOf(role).model, settingsOf(role).effort].join(":")).join("|");

export const voyageRoleSettings =
	(voyage: VoyageView) =>
	(role: VoyageAgentRole): AgentSettingsChoice =>
		role === "captain" ? voyage.captainSettings : voyage.crewSettings;

export const fleetPlaceholder = (backends: ReadonlyArray<string>): RolePlaceholder => ({
	backend: backends[0] ?? "",
	effort: BACKEND_OWN,
	model: BACKEND_OWN,
});

export const voyagePlaceholder = (backends: ReadonlyArray<string>, fleetDefault: AgentSettingsChoice, backend: string): RolePlaceholder => {
	const inherited = fleetDefault.backend ?? backends[0] ?? "";
	const sails = backend === "" || backend === inherited;
	return {
		backend: inherited,
		effort: (sails ? fleetDefault.effort : null) ?? BACKEND_OWN,
		model: (sails ? fleetDefault.model : null) ?? BACKEND_OWN,
	};
};
