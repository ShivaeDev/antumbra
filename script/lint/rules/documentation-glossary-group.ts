import { linkAnchor, linkPath } from "#lint/rules/markdown.ts";
import type { Violation } from "#lint/violation.ts";

const GLOSSARY = "GLOSSARY.md";
const DESIGN_ROOT = "docs/design/";
const DESIGN_INDEX = `${DESIGN_ROOT}README.md`;

export interface GlossaryTarget {
	readonly line: number;
	readonly target: string;
}

const violation = (line: number, message: string): Violation => ({
	file: GLOSSARY,
	line,
	message,
	rule: "docs/glossary-owner",
});

const ownerLocationViolations = (
	owner: GlossaryTarget,
): readonly Violation[] => {
	const path = linkPath(GLOSSARY, owner.target);
	return path.startsWith(DESIGN_ROOT) &&
		path !== DESIGN_INDEX &&
		linkAnchor(owner.target) === undefined
		? []
		: [
				violation(
					owner.line,
					"a glossary owner must be one topic page under docs/design/.",
				),
			];
};

const termOwnerViolations = (
	owner: GlossaryTarget,
	terms: readonly GlossaryTarget[],
): readonly Violation[] => {
	const ownerPath = linkPath(GLOSSARY, owner.target);
	return terms.flatMap((term) =>
		linkPath(GLOSSARY, term.target) === ownerPath &&
		linkAnchor(term.target) !== undefined
			? []
			: [
					violation(
						term.line,
						"glossary terms must link to an anchor in their group's topic owner.",
					),
				],
	);
};

export const glossaryGroupViolations = (
	line: number,
	owners: readonly GlossaryTarget[],
	terms: readonly GlossaryTarget[],
): readonly Violation[] => {
	if (owners.length !== 1) {
		return [
			violation(
				line,
				"each glossary group must declare exactly one topic owner.",
			),
		];
	}
	const owner = owners[0];
	return owner === undefined
		? []
		: [...ownerLocationViolations(owner), ...termOwnerViolations(owner, terms)];
};
