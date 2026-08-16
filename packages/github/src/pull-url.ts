import { Option } from "effect";
import type { GitHubRepoName } from "#source.ts";

export interface PullRequestRef extends GitHubRepoName {
	readonly number: number;
}

const PULL_URL =
	/^https?:\/\/github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)\/pull\/(\d+)(?:[/?#].*)?$/;

// why: adopting is done by pasting a link, and a link carries everything the
// host needs — which repo and which number. Anything else is not a pull
// request address, and saying so beats adopting the wrong change.
export const parsePullUrl = (url: string): Option.Option<PullRequestRef> => {
	const matched = PULL_URL.exec(url.trim());
	const owner = matched?.[1];
	const name = matched?.[2];
	const number = Number(matched?.[3]);
	return owner === undefined ||
		name === undefined ||
		!Number.isSafeInteger(number)
		? Option.none()
		: Option.some({ name, number, owner });
};
