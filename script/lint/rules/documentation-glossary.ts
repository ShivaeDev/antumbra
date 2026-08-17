import type { TextFile } from "#lint/inventory.ts";
import { linkAnchor, linkPath } from "#lint/rules/markdown.ts";
import type { Violation } from "#lint/violation.ts";

const GLOSSARY = "GLOSSARY.md";
const OWNER = /^Owner: \[[^\]]+\]\(([^)]+)\)$/;
const TERM = /^- \[\*\*([^*]+)\*\*\]\(([^)]+)\) — \S/;

const violation = (
	line: number | undefined,
	rule: string,
	message: string,
): Violation => ({ file: GLOSSARY, line, message, rule });

const normalizedTerm = (term: string): string =>
	term.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]/gu, "");

export const glossaryViolations = (
	documents: ReadonlyMap<string, TextFile>,
): readonly Violation[] => {
	const glossary = documents.get(GLOSSARY);
	if (glossary === undefined) return [];
	const found = new Set<string>();
	const violations: Violation[] = [];
	let owners: string[] = [];
	let terms: ReadonlyArray<{ readonly line: number; readonly target: string }> =
		[];
	const closeGroup = (): void => {
		if (owners.length === 0 && terms.length === 0) return;
		if (owners.length !== 1) {
			violations.push(
				violation(
					undefined,
					"docs/glossary-owner",
					"each glossary group must declare exactly one topic owner.",
				),
			);
		} else {
			const ownerPath = linkPath(GLOSSARY, owners[0] ?? "");
			for (const term of terms) {
				if (
					linkPath(GLOSSARY, term.target) !== ownerPath ||
					linkAnchor(term.target) === undefined
				) {
					violations.push(
						violation(
							term.line,
							"docs/glossary-owner",
							"glossary terms must link to an anchor in their group's topic owner.",
						),
					);
				}
			}
		}
		owners = [];
		terms = [];
	};
	glossary.raw.split("\n").forEach((line, index) => {
		if (line.startsWith("## ")) closeGroup();
		const owner = OWNER.exec(line)?.[1];
		if (owner !== undefined) owners.push(owner);
		const term = TERM.exec(line);
		if (term === null) return;
		const key = normalizedTerm(term[1] ?? "");
		if (found.has(key)) {
			violations.push(
				violation(
					index + 1,
					"docs/glossary-term",
					`glossary term is duplicated after normalization: ${term[1]}`,
				),
			);
		}
		found.add(key);
		terms = [...terms, { line: index + 1, target: term[2] ?? "" }];
	});
	closeGroup();
	return violations;
};
