import { Option } from "effect";

export interface GitHubRepoName {
	readonly name: string;
	readonly owner: string;
}

// Owner and name are interpolated into the GraphQL document.
const SEGMENT = "[A-Za-z0-9._-]+";

const GITHUB_SOURCE = new RegExp(`^(?:(?:https?|ssh)://)?(?:[^@/]+@)?github\\.com[/:](${SEGMENT})/(${SEGMENT}?)(?:\\.git)?/?$`);

export const parseGitHubSource = (source: string): Option.Option<GitHubRepoName> => {
	const matched = GITHUB_SOURCE.exec(source.trim());
	const owner = matched?.[1];
	const name = matched?.[2];
	return owner === undefined || name === undefined ? Option.none() : Option.some({ name, owner });
};

export const sameRepo = (left: GitHubRepoName, right: GitHubRepoName): boolean =>
	left.owner.toLowerCase() === right.owner.toLowerCase() && left.name.toLowerCase() === right.name.toLowerCase();
