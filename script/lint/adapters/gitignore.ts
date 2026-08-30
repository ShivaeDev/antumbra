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

// why: git decides a directory once. Re-including `build/` in a nested file
// settles it for the whole subtree, so an outer `build/` must stop applying to
// what is inside while an outer `*.log` keeps applying. Anchoring later
// questions at the re-included directory is what draws that line.
export const insideKept = (scope: IgnoreScope, directory: string): IgnoreScope => ({ boundary: directory, matchers: scope.matchers });

const matcherVerdict = (matcher: IgnoreMatcher, boundary: string | undefined, path: string, directory: boolean): Verdict => {
	const anchor = boundary !== undefined && boundary.length > matcher.base.length ? boundary : matcher.base;
	const rel = posix(relative(anchor, path));
	if (rel === "" || rel.startsWith("..")) {
		return "unknown";
	}
	// why: git tests a directory with a trailing slash, which is what makes a
	// directory-only pattern such as `build/` match the directory itself.
	const result = matcher.rules.test(directory ? `${rel}/` : rel);
	if (result.ignored) {
		return "ignored";
	}
	return result.unignored ? "kept" : "unknown";
};

// why: the deepest .gitignore with an opinion decides, so a nested file can
// re-include what a shallower one ignored.
export const verdictFor = (scope: IgnoreScope, path: string, directory: boolean): Verdict =>
	scope.matchers.map((matcher) => matcherVerdict(matcher, scope.boundary, path, directory)).findLast((verdict) => verdict !== "unknown") ?? "unknown";
