import { inheritedFrom, type Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";

const INHERIT = "Inherit";

const UNLISTED = "waiting for the backend to list its models";

const UNDECLARED = "backend decides";

type Named = Resolution["model"];

const shown = (named: Named, absent: string): string => (named.source === "chosen" ? "" : (named.value ?? absent));

export const placeholdersOf = (resolved: Resolution): Readonly<Record<string, string>> => {
	const inherited = inheritedFrom(resolved.backend.source);
	return {
		backend: inherited === undefined ? INHERIT : `${resolved.backend.value} (${inherited})`,
		effort: shown(resolved.effort, UNDECLARED),
		model: shown(resolved.model, UNLISTED),
	};
};

export const captionsOf = (resolved: Resolution): Readonly<Record<string, string>> => {
	const captions: Record<string, string> = {};
	for (const [name, named] of [
		["effort", resolved.effort],
		["model", resolved.model],
	] as const) {
		const inherited = inheritedFrom(named.source);
		if (inherited !== undefined && named.value !== null) captions[name] = inherited;
	}
	return captions;
};
