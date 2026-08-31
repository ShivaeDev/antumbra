import { relative } from "node:path";
import ignore from "ignore";

export type Verdict = "ignored" | "kept" | "unknown";

interface IgnoreMatcher {
	readonly base: string;
	readonly rules: ReturnType<typeof ignore>;
}

export interface IgnoreScope {
	readonly boundary: string | undefined;
	readonly matchers: readonly IgnoreMatcher[];
}

export const emptyScope: IgnoreScope = { boundary: undefined, matchers: [] };

const posix = (path: string): string => path.replaceAll("\\", "/");

export const withGitignore = (scope: IgnoreScope, base: string, contents: string): IgnoreScope => ({
	boundary: scope.boundary,
	matchers: [...scope.matchers, { base, rules: ignore().add(contents) }],
});

// Re-including a directory resets directory rules below that boundary; filename rules still apply.
export const insideKept = (scope: IgnoreScope, directory: string): IgnoreScope => ({ boundary: directory, matchers: scope.matchers });

const matcherVerdict = (matcher: IgnoreMatcher, boundary: string | undefined, path: string, directory: boolean): Verdict => {
	const anchor = boundary !== undefined && boundary.length > matcher.base.length ? boundary : matcher.base;
	const rel = posix(relative(anchor, path));
	if (rel === "" || rel.startsWith("..")) {
		return "unknown";
	}
	// Git matches directory-only patterns against paths with a trailing slash.
	const result = matcher.rules.test(directory ? `${rel}/` : rel);
	if (result.ignored) {
		return "ignored";
	}
	return result.unignored ? "kept" : "unknown";
};

// The deepest gitignore with an opinion wins.
export const verdictFor = (scope: IgnoreScope, path: string, directory: boolean): Verdict =>
	scope.matchers.map((matcher) => matcherVerdict(matcher, scope.boundary, path, directory)).findLast((verdict) => verdict !== "unknown") ?? "unknown";
