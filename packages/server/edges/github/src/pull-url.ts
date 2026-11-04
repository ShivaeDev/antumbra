import { Option } from "effect";
import type { GitHubRepoName } from "#source.ts";

export interface PullRequestRef extends GitHubRepoName {
	readonly number: number;
}

const PULL_URL = /^https?:\/\/([^/]+)\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)\/pull\/(\d+)(?:[/?#].*)?$/;

export const parsePullUrl = (url: string, hostname = "github.com"): Option.Option<PullRequestRef> => {
	const matched = PULL_URL.exec(url.trim());
	const host = matched?.[1];
	const owner = matched?.[2];
	const name = matched?.[3];
	const number = Number(matched?.[4]);
	return host?.toLowerCase() !== hostname.toLowerCase() || owner === undefined || name === undefined || !Number.isSafeInteger(number)
		? Option.none()
		: Option.some({ name, number, owner });
};
