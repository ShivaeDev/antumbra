import { Option } from "effect";

export interface GitHubRepoName {
	readonly name: string;
	readonly owner: string;
}

// why: owner and name are restricted to what GitHub itself allows rather than
// to "anything without a slash", because both are interpolated into a GraphQL
// document further down. Narrowing at the parse boundary is what makes that
// interpolation safe everywhere else.
const SEGMENT = "[A-Za-z0-9._-]+";

const GITHUB_SOURCE = new RegExp(`^(?:(?:https?|ssh)://)?(?:[^@/]+@)?github\\.com[/:](${SEGMENT})/(${SEGMENT}?)(?:\\.git)?/?$`);

// why: a repo lives on this host or it does not — a local path, a GitHub
// Enterprise domain, or another forge reads as none, and the domain then asks
// the next registered host instead of this one guessing.
export const parseGitHubSource = (source: string): Option.Option<GitHubRepoName> => {
	const matched = GITHUB_SOURCE.exec(source.trim());
	const owner = matched?.[1];
	const name = matched?.[2];
	return owner === undefined || name === undefined ? Option.none() : Option.some({ name, owner });
};

export const sameRepo = (left: GitHubRepoName, right: GitHubRepoName): boolean =>
	left.owner.toLowerCase() === right.owner.toLowerCase() && left.name.toLowerCase() === right.name.toLowerCase();
