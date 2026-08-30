import type { SourceComment } from "#lint/adapters/typescript.ts";
import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

const violation = (file: string, line: number, rule: string, message: string): Violation => ({ file, line, message, rule: `comments/${rule}` });

const policyViolations = (file: string, comment: SourceComment): readonly Violation[] => {
	const violations: Violation[] = [];
	if (comment.content.includes("biome-ignore")) {
		violations.push(
			violation(file, comment.line, "no-lint-suppression", "Lint suppression is banned. Fix the rule or the code; never silence the site."),
		);
	}
	if (comment.content.includes("@ts-ignore") || comment.content.includes("@ts-nocheck")) {
		violations.push(
			violation(file, comment.line, "no-ts-ignore", "@ts-ignore and @ts-nocheck are never allowed. Use a registered @ts-expect-error with a reason."),
		);
	}
	return violations;
};

export const commentViolations = (inventory: Inventory): readonly Violation[] =>
	inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => file.comments.flatMap((comment) => policyViolations(file.path, comment)));
