import { type Inventory, isDeclaration } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

const TOO_DEEP = /^\t{8,}/;

const fileViolations = (
	path: string,
	lines: readonly string[],
): readonly Violation[] =>
	lines.flatMap((text, index) => {
		if (!TOO_DEEP.test(text)) {
			return [];
		}
		return [
			{
				file: path,
				line: index + 1,
				message:
					"Indentation is 8+ tabs deep. Extract a named function or component.",
				rule: "nesting/max-depth",
			},
		];
	});

export const nestingViolations = (inventory: Inventory): readonly Violation[] =>
	inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => fileViolations(file.path, file.lines));
