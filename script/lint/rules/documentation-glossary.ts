import type { TextFile } from "#lint/inventory.ts";
import {
	type GlossaryTarget,
	glossaryGroupViolations,
} from "#lint/rules/documentation-glossary-group.ts";
import { markdownProseLines } from "#lint/rules/markdown.ts";
import type { Violation } from "#lint/violation.ts";

const GLOSSARY = "GLOSSARY.md";
const OWNER = /^Owner: \[[^\]]+\]\(([^)]+)\)$/;
const TERM = /^- \[\*\*([^*]+)\*\*\]\(([^)]+)\) — \S.*$/;

const violation = (
	line: number | undefined,
	rule: string,
	message: string,
): Violation => ({ file: GLOSSARY, line, message, rule });

const normalizedTerm = (term: string): string =>
	term.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]/gu, "");

const malformedRowViolations = (
	line: number,
	raw: string,
): readonly Violation[] =>
	raw.startsWith("- ")
		? [
				violation(
					line,
					"docs/glossary-row",
					"glossary term rows must link one bold term to its owning topic anchor.",
				),
			]
		: [];

const duplicateTermViolations = (
	found: Set<string>,
	line: number,
	term: string,
): readonly Violation[] => {
	const key = normalizedTerm(term);
	if (found.has(key)) {
		return [
			violation(
				line,
				"docs/glossary-term",
				`glossary term is duplicated after normalization: ${term}`,
			),
		];
	}
	found.add(key);
	return [];
};

export const glossaryViolations = (
	documents: ReadonlyMap<string, TextFile>,
): readonly Violation[] => {
	const glossary = documents.get(GLOSSARY);
	if (glossary === undefined) return [];
	const found = new Set<string>();
	const violations: Violation[] = [];
	let groupLine: number | undefined;
	let owners: readonly GlossaryTarget[] = [];
	let terms: readonly GlossaryTarget[] = [];
	const closeGroup = (): void => {
		if (groupLine !== undefined) {
			violations.push(...glossaryGroupViolations(groupLine, owners, terms));
		}
		owners = [];
		terms = [];
		groupLine = undefined;
	};
	for (const { line: lineNumber, raw: line } of markdownProseLines(glossary)) {
		if (line.startsWith("## ")) {
			closeGroup();
			groupLine = lineNumber;
			continue;
		}
		if (groupLine === undefined) continue;
		const owner = OWNER.exec(line)?.[1];
		if (owner !== undefined) {
			owners = [...owners, { line: lineNumber, target: owner }];
			continue;
		}
		const term = TERM.exec(line);
		if (term === null) {
			violations.push(...malformedRowViolations(lineNumber, line));
			continue;
		}
		violations.push(
			...duplicateTermViolations(found, lineNumber, term[1] ?? ""),
		);
		terms = [...terms, { line: lineNumber, target: term[2] ?? "" }];
	}
	closeGroup();
	return violations;
};
