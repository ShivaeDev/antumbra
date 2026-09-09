import { AGENT_ROLES, type AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import {
	BACKEND_OWN,
	type BackendModels,
	fieldsOf,
	type RoleChoice,
	type RoleDraft,
	type RolePlaceholder,
	type SettingsName,
	type SettingsValues,
	type Stored,
	UNCHOSEN,
} from "#shape.ts";

const named = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export const storedAt = (rows: readonly Stored[], role: AgentRole): RoleChoice => {
	for (const row of rows) {
		if (row.role === role) {
			return { backend: row.backend, effort: row.effort, model: row.model };
		}
	}
	return UNCHOSEN;
};

export const draftOf = (choice: RoleChoice): RoleDraft => ({
	backend: choice.backend ?? "",
	effort: choice.effort ?? "",
	model: choice.model ?? "",
});

export const chosenOf = (draft: RoleDraft): RoleChoice => ({
	backend: named(draft.backend),
	effort: named(draft.effort),
	model: named(draft.model),
});

export const draftAt = (values: SettingsValues, role: AgentRole): RoleDraft => {
	const names = fieldsOf[role];
	return { backend: values[names.backend], effort: values[names.effort], model: values[names.model] };
};

export const valuesOf = (rows: readonly Stored[]): SettingsValues => {
	const values: Record<SettingsName, string> = {
		captainBackend: "",
		captainEffort: "",
		captainModel: "",
		crewBackend: "",
		crewEffort: "",
		crewModel: "",
		flagshipBackend: "",
		flagshipEffort: "",
		flagshipModel: "",
		smootherBackend: "",
		smootherEffort: "",
		smootherModel: "",
	};
	for (const role of AGENT_ROLES) {
		const draft = draftOf(storedAt(rows, role));
		const names = fieldsOf[role];
		values[names.backend] = draft.backend;
		values[names.effort] = draft.effort;
		values[names.model] = draft.model;
	}
	return values;
};

export const changedRoles = (roles: readonly AgentRole[], values: SettingsValues, rows: readonly Stored[]): readonly AgentRole[] => {
	const changed: AgentRole[] = [];
	for (const role of roles) {
		const chosen = chosenOf(draftAt(values, role));
		const stored = storedAt(rows, role);
		if (chosen.backend !== stored.backend || chosen.effort !== stored.effort || chosen.model !== stored.model) {
			changed.push(role);
		}
	}
	return changed;
};

export const fleetPlaceholder = (backends: readonly BackendModels[]): RolePlaceholder => ({
	backend: backends[0]?.tag ?? "",
	effort: BACKEND_OWN,
	model: BACKEND_OWN,
});

export const voyagePlaceholder = (backends: readonly BackendModels[], fleetDefault: RoleChoice, backend: string): RolePlaceholder => {
	const inherited = fleetDefault.backend ?? backends[0]?.tag ?? "";
	const sails = backend === "" || backend === inherited;
	return {
		backend: inherited,
		effort: (sails ? fleetDefault.effort : null) ?? BACKEND_OWN,
		model: (sails ? fleetDefault.model : null) ?? BACKEND_OWN,
	};
};
