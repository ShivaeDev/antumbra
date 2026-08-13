export interface Violation {
	readonly file: string;
	readonly line: number | undefined;
	readonly message: string;
	readonly rule: string;
}

export const byLocation = (left: Violation, right: Violation): number =>
	left.file.localeCompare(right.file) ||
	(left.line ?? 0) - (right.line ?? 0) ||
	left.rule.localeCompare(right.rule);
