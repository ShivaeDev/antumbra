import type { Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { inheritedFrom, type RoleSettingSource, UNDECLARED_EFFORT, UNLISTED_MODEL } from "@antumbra/platform-vocabulary/role-setting.ts";

const sourced = (source: RoleSettingSource): string => {
	const inherited = inheritedFrom(source);
	return inherited === undefined ? "" : ` (${inherited})`;
};

export const resolvedPart = (role: string, resolved: Resolution): string => {
	const said = [`${role} on ${resolved.backend.value}${sourced(resolved.backend.source)}`];
	const open = [];
	for (const [label, named, before, after, absent] of [
		["model", resolved.model, "with", "", UNLISTED_MODEL],
		["effort", resolved.effort, "at", " effort", UNDECLARED_EFFORT],
	] as const) {
		if (named.value === null) open.push(`${label}: ${absent}`);
		else said.push(`${before} ${named.value}${after}${sourced(named.source)}`);
	}
	return [said.join(" "), ...open].join(", ");
};
