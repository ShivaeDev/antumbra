import { inheritedFrom, type Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";

export const resolvedPart = (role: string, resolved: Resolution): string => {
	const said = [role];
	for (const [named, before, after] of [
		[resolved.backend, "on", ""],
		[resolved.model, "with", ""],
		[resolved.effort, "at", " effort"],
	] as const) {
		if (named.value === null) continue;
		const inherited = inheritedFrom(named.source);
		said.push(`${before} ${named.value}${after}${inherited === undefined ? "" : ` (${inherited})`}`);
	}
	return said.join(" ");
};
