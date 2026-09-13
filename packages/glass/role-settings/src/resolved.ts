import type { Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { inheritedFrom, inheritedWords } from "@antumbra/platform-vocabulary/role-setting.ts";

type Named = Resolution["model"];

const resolvedWords = (named: Named): string => {
	if (named.value === null) {
		return inheritedWords("backend");
	}
	const inherited = inheritedFrom(named.source);
	return inherited === undefined ? named.value : `${named.value} · ${inherited}`;
};

export const placeholdersOf = (resolved: Resolution): Readonly<Record<string, string>> => ({
	backend: `${resolved.fallback.value} · ${inheritedWords(resolved.fallback.source)}`,
	effort: resolvedWords(resolved.effort),
	model: resolvedWords(resolved.model),
});
