import type { TextFile } from "#lint/inventory.ts";
import { glossaryViolations } from "#lint/rules/documentation-glossary.ts";
import {
	anchorsOf,
	isLocalMarkdown,
	linkAnchor,
	linkPath,
	linksOf,
} from "#lint/rules/markdown.ts";
import type { Violation } from "#lint/violation.ts";

const DESIGN_INDEX = "docs/design/README.md";
const GLOSSARY = "GLOSSARY.md";
const PUBLIC_ROOT = "README.md";

const violation = (
	file: string,
	line: number | undefined,
	rule: string,
	message: string,
): Violation => ({ file, line, message, rule });

const linkViolations = (
	documents: ReadonlyMap<string, TextFile>,
): readonly Violation[] =>
	[...documents.values()].flatMap((document) =>
		linksOf(document).flatMap((link) => {
			if (!isLocalMarkdown(link.target)) return [];
			const path = linkPath(document.path, link.target);
			const target = documents.get(path);
			if (target === undefined) {
				return [
					violation(
						document.path,
						link.line,
						"docs/relative-link",
						`relative Markdown link does not resolve: ${link.target}`,
					),
				];
			}
			const fragment = linkAnchor(link.target);
			return fragment === undefined || anchorsOf(target).has(fragment)
				? []
				: [
						violation(
							document.path,
							link.line,
							"docs/anchor",
							`Markdown anchor does not resolve: ${link.target}`,
						),
					];
		}),
	);

const reachableViolations = (
	documents: ReadonlyMap<string, TextFile>,
): readonly Violation[] => {
	const reached = new Set<string>();
	const pending = [PUBLIC_ROOT];
	while (pending.length > 0) {
		const path = pending.pop();
		if (path === undefined || reached.has(path)) continue;
		reached.add(path);
		const document = documents.get(path);
		if (document === undefined) continue;
		for (const link of linksOf(document)) {
			const next = linkPath(path, link.target);
			if (documents.has(next)) pending.push(next);
		}
	}
	return [...documents.keys()]
		.filter(
			(path) =>
				(path === "DESIGN.md" ||
					path === "ARCHITECTURE.md" ||
					path === GLOSSARY ||
					path.startsWith("docs/design/")) &&
				!reached.has(path),
		)
		.map((path) =>
			violation(
				path,
				undefined,
				"docs/reachability",
				"public design documentation is not reachable from README.md.",
			),
		);
};

const designIndexViolations = (
	documents: ReadonlyMap<string, TextFile>,
): readonly Violation[] => {
	const index = documents.get(DESIGN_INDEX);
	if (index === undefined) {
		return [
			violation(
				DESIGN_INDEX,
				undefined,
				"docs/design-index",
				"design index is missing.",
			),
		];
	}
	const counts = new Map<string, number>();
	for (const link of linksOf(index)) {
		const path = linkPath(index.path, link.target);
		counts.set(path, (counts.get(path) ?? 0) + 1);
	}
	return [...documents.keys()]
		.filter((path) => path.startsWith("docs/design/") && path !== DESIGN_INDEX)
		.filter((path) => counts.get(path) !== 1)
		.map((path) =>
			violation(
				DESIGN_INDEX,
				undefined,
				"docs/design-index",
				`${path} must appear exactly once in the design index.`,
			),
		);
};

export const documentationViolations = (
	documents: readonly TextFile[],
): readonly Violation[] => {
	const byPath = new Map(
		documents.map((document) => [document.path, document]),
	);
	return [
		...linkViolations(byPath),
		...reachableViolations(byPath),
		...designIndexViolations(byPath),
		...glossaryViolations(byPath),
	];
};
