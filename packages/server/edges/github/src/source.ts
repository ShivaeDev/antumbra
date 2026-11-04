import { Option } from "effect";

export interface GitHubRepoName {
	readonly name: string;
	readonly owner: string;
}

// Owner and name are interpolated into the GraphQL document.
const SEGMENT = "[A-Za-z0-9._-]+";

const GITHUB_SOURCE = new RegExp(`^(?:(?:https?|ssh)://)?(?:[^@/]+@)?([^/:]+)[/:](${SEGMENT})/(${SEGMENT}?)(?:\\.git)?/?$`);

export const parseGitHubSource = (source: string, hostname = "github.com"): Option.Option<GitHubRepoName> => {
	const matched = GITHUB_SOURCE.exec(source.trim());
	const host = matched?.[1];
	const owner = matched?.[2];
	const name = matched?.[3];
	return host?.toLowerCase() !== hostname.toLowerCase() || owner === undefined || name === undefined ? Option.none() : Option.some({ name, owner });
};

export const sameRepo = (left: GitHubRepoName, right: GitHubRepoName): boolean =>
	left.owner.toLowerCase() === right.owner.toLowerCase() && left.name.toLowerCase() === right.name.toLowerCase();
