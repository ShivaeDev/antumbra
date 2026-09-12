import type { Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";

interface Choice {
	readonly backend: string | null;
	readonly model: string | null;
	readonly effort: string | null;
}

export const rolePart = (role: string, settings: Choice, unnamed: string): string => {
	const named = [
		...(settings.backend === null ? [] : [`on ${settings.backend}`]),
		...(settings.model === null ? [] : [`with ${settings.model}`]),
		...(settings.effort === null ? [] : [`at ${settings.effort} effort`]),
	];
	return named.length === 0 ? `${role} ${unnamed}` : [role, ...named].join(" ");
};

export const resolvedPart = (role: string, resolved: Resolution): string =>
	rolePart(role, { backend: resolved.backend.value, effort: resolved.effort.value, model: resolved.model.value }, "unnamed");
