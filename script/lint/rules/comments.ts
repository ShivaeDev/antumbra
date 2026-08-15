import type { SourceComment } from "#lint/adapters/typescript.ts";
import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

const bodyOf = (comment: SourceComment): string =>
	comment.content.slice(2).trimStart();

const violation = (
	file: string,
	line: number,
	rule: string,
	message: string,
): Violation => ({ file, line, message, rule: `comments/${rule}` });

const policyViolations = (
	file: string,
	comment: SourceComment,
	continuation: boolean,
): readonly Violation[] => {
	const body = bodyOf(comment);
	const violations: Violation[] = [];
	if (comment.content.includes("biome-ignore")) {
		violations.push(
			violation(
				file,
				comment.line,
				"no-lint-suppression",
				"Lint suppression is banned. Fix the rule or the code; never silence the site.",
			),
		);
	}
	if (
		comment.content.includes("@ts-ignore") ||
		comment.content.includes("@ts-nocheck")
	) {
		violations.push(
			violation(
				file,
				comment.line,
				"no-ts-ignore",
				"@ts-ignore and @ts-nocheck are never allowed. Use a registered @ts-expect-error with a reason.",
			),
		);
	}
	if (
		!body.startsWith("why:") &&
		!(comment.kind === "line" && body.includes("@ts-expect-error")) &&
		!continuation
	) {
		violations.push(
			violation(
				file,
				comment.line,
				"no-plain-comment",
				"Comments are banned unless they carry the why: marker or are registered pragmas.",
			),
		);
	}
	return violations;
};

const fileViolations = (
	file: string,
	comments: readonly SourceComment[],
): readonly Violation[] => {
	const violations: Violation[] = [];
	let continuationLine: number | undefined;
	for (const comment of comments) {
		const continuation =
			comment.kind === "line" &&
			comment.fullLine &&
			comment.line === continuationLine;
		violations.push(...policyViolations(file, comment, continuation));
		const opensWhyBlock =
			comment.kind === "line" &&
			comment.fullLine &&
			(bodyOf(comment).startsWith("why:") || continuation);
		continuationLine = opensWhyBlock ? comment.endLine + 1 : undefined;
	}
	return violations;
};

export const commentViolations = (inventory: Inventory): readonly Violation[] =>
	inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => fileViolations(file.path, file.comments));
