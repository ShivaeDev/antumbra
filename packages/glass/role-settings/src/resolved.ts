import type { Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { type Inherited, inheritedFrom, inheritedWords } from "@antumbra/platform-vocabulary/role-setting.ts";

type Named = Resolution["model"];

const resolvedWords = (named: Named): string => {
	if (named.value === null) {
		return inheritedWords("backend");
	}
	const inherited = inheritedFrom(named.source);
	return inherited === undefined ? named.value : `${named.value} · ${inherited}`;
};

export const unsetWords = (resolved: Resolution, inherits: Inherited): string => {
	const inherited = inheritedFrom(resolved.backend.source);
	return inherited === undefined ? inheritedWords(inherits) : `${resolved.backend.value} · ${inherited}`;
};

export const placeholdersOf = (resolved: Resolution, inherits: Inherited): Readonly<Record<string, string>> => ({
	backend: unsetWords(resolved, inherits),
	effort: resolvedWords(resolved.effort),
	model: resolvedWords(resolved.model),
});
