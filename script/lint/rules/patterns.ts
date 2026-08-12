import {
	type Inventory,
	isDeclaration,
	type SourceFile,
} from "#lint/inventory.ts";
import ruleData from "#lint/rules/rule-patterns.json" with { type: "json" };
import type { Violation } from "#lint/violation.ts";

// why: every regex source here contains the token it bans, so a rule table
// written in TypeScript would make the self-hosted lint flag its own
// definitions. The corpus lives in JSON, which this walk never reads.

interface CompiledRule {
	readonly excludePaths: readonly string[];
	readonly id: string;
	readonly message: string;
	readonly pattern: RegExp;
}

const RULES: readonly CompiledRule[] = ruleData.patterns.map((rule) => ({
	excludePaths: rule.excludePaths,
	id: rule.id,
	message: rule.message,
	pattern: new RegExp(rule.pattern),
}));

const WHY_OPENER = new RegExp(ruleData.whyOpener);
const COMMENT_LINE = new RegExp(ruleData.commentLine);

// why: a full-line comment directly under a `// why:` line continues that
// explanation, so the plain-comment ban must treat the whole block as one
// marked comment instead of flagging every wrapped line.
const whyContinuations = (lines: readonly string[]): ReadonlySet<number> => {
	const continuations = new Set<number>();
	let inWhyBlock = false;
	lines.forEach((text, index) => {
		if (WHY_OPENER.test(text)) {
			inWhyBlock = true;
			return;
		}
		if (inWhyBlock && COMMENT_LINE.test(text)) {
			continuations.add(index);
			return;
		}
		inWhyBlock = false;
	});
	return continuations;
};

const ruleViolations = (
	file: SourceFile,
	rule: CompiledRule,
	continuations: ReadonlySet<number>,
): readonly Violation[] =>
	file.lines.flatMap((text, index) =>
		(rule.id === "no-plain-comment" && continuations.has(index)) ||
		!rule.pattern.test(text)
			? []
			: [
					{
						file: file.path,
						line: index + 1,
						message: rule.message,
						rule: `patterns/${rule.id}`,
					},
				],
	);

const fileViolations = (file: SourceFile): readonly Violation[] => {
	const continuations = whyContinuations(file.lines);
	return RULES.filter(
		(rule) => !rule.excludePaths.some((part) => file.path.includes(part)),
	).flatMap((rule) => ruleViolations(file, rule, continuations));
};

export const patternViolations = (inventory: Inventory): readonly Violation[] =>
	inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap(fileViolations);
