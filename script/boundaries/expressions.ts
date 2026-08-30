import type { ImportSource, ImportTarget } from "#boundaries/model.ts";

export const escapeExpression = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const alternatives = (values: readonly string[]) =>
	values.map(escapeExpression).join("|");

export const compileSelector = (
	selector: ImportSource | ImportTarget,
): string => {
	switch (selector.kind) {
		case "all-applications":
			return "^apps/";
		case "all-packages":
			return "^packages/";
		case "any":
			return selector.selectors
				.map((member) => `(?:${compileSelector(member)})`)
				.join("|");
		case "application":
			return `^apps/(${alternatives(selector.names)})(?:/|$)`;
		case "package":
			return `^packages/(${alternatives(selector.names)})(?:/|$)`;
		case "external-module":
			return selector.name.startsWith("node:")
				? `^${escapeExpression(selector.name)}$`
				: `(^|/)${escapeExpression(selector.name)}(?:/|$)`;
		case "external-namespace":
			return `(^|/)${escapeExpression(selector.name)}(?:/|$)`;
		case "package-family":
			return `^packages/${escapeExpression(selector.family)}-[^/]+(?:/|$)`;
		case "workspace-except":
			return `^packages/(?!${[
				...selector.excludedPackages,
				...selector.sanctioned.map((exception) => exception.package),
			]
				.map((name) => `${escapeExpression(name)}(?:/|$)`)
				.join("|")})|^apps/`;
		case "workspace-sources-except":
			return `^packages/(?!${selector.excludedPackages
				.map((name) => `${escapeExpression(name)}(?:/|$)`)
				.join("|")})[^/]+/src/|^apps/[^/]+/src/`;
	}
};
