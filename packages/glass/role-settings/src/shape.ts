import type { AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { Schema } from "effect";

export interface ModelChoice {
	readonly efforts: readonly string[];
	readonly id: string;
	readonly isDefault: boolean;
	readonly name: string;
}

export interface BackendModels {
	readonly failure: string | null;
	readonly models: readonly ModelChoice[];
	readonly tag: string;
}

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

export interface RoleChoice {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
}

export interface Stored extends RoleChoice {
	readonly role: string;
}

export const BACKEND_OWN = "the backend's own";

export const UNCHOSEN: RoleChoice = { backend: null, effort: null, model: null };

export const EMPTY_PLACEHOLDER: RolePlaceholder = { backend: "", effort: BACKEND_OWN, model: BACKEND_OWN };

export const roleLabel: Record<AgentRole, string> = { captain: "Captain", crew: "Crew", flagship: "Flagship", smoother: "Smoother" };

export const settingsSchema = Schema.Struct({
	captainBackend: Schema.String,
	captainEffort: Schema.String,
	captainModel: Schema.String,
	crewBackend: Schema.String,
	crewEffort: Schema.String,
	crewModel: Schema.String,
	flagshipBackend: Schema.String,
	flagshipEffort: Schema.String,
	flagshipModel: Schema.String,
	smootherBackend: Schema.String,
	smootherEffort: Schema.String,
	smootherModel: Schema.String,
});

export type SettingsFields = typeof settingsSchema.fields;

export type SettingsValues = typeof settingsSchema.Encoded;

export type SettingsName = keyof SettingsValues & string;

export interface RoleNames {
	readonly backend: SettingsName;
	readonly effort: SettingsName;
	readonly model: SettingsName;
}

export const fieldsOf: Record<AgentRole, RoleNames> = {
	captain: { backend: "captainBackend", effort: "captainEffort", model: "captainModel" },
	crew: { backend: "crewBackend", effort: "crewEffort", model: "crewModel" },
	flagship: { backend: "flagshipBackend", effort: "flagshipEffort", model: "flagshipModel" },
	smoother: { backend: "smootherBackend", effort: "smootherEffort", model: "smootherModel" },
};
