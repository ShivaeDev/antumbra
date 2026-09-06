import type { ImportSource, ImportTarget, LocatePackage } from "#boundaries/model.ts";

export const escapeExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const alternatives = (values: readonly string[]) => values.map(escapeExpression).join("|");

export const compileSelector = (selector: ImportSource | ImportTarget, locate: LocatePackage): string => {
	switch (selector.kind) {
		case "all-applications":
			return "^apps/";
		case "all-packages":
			return "^packages/";
		case "any":
			return selector.selectors.map((member) => `(?:${compileSelector(member, locate)})`).join("|");
		case "application":
			return `^apps/(${alternatives(selector.names)})(?:/|$)`;
		case "package":
			return `^(${alternatives(selector.names.map(locate))})(?:/|$)`;
		case "external-module":
			return selector.name.startsWith("node:") ? `^${escapeExpression(selector.name)}$` : `(^|/)${escapeExpression(selector.name)}(?:/|$)`;
		case "external-namespace":
			return `(^|/)${escapeExpression(selector.name)}(?:/|$)`;
		case "package-family":
			return `^packages/${escapeExpression(selector.family)}-[^/]+(?:/|$)`;
		case "workspace-except":
			return `^(?!(?:${[...selector.excludedPackages, ...selector.sanctioned.map((exception) => exception.package)]
				.map((name) => escapeExpression(locate(name)))
				.join("|")})(?:/|$))(?:apps|packages)/`;
	}
};
