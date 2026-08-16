import type { PullRequestRef } from "#pull-url.ts";

// why: one call per fifty changes rather than one per change — a watcher pass
// over a busy fleet is a handful of requests, and GitHub's node limit for a
// single document sits far above this.
export const OBSERVE_CHUNK_SIZE = 50;

const PULL_FIELDS = [
	"number",
	"url",
	"title",
	"state",
	"isDraft",
	"mergeStateStatus",
	"reviewDecision",
	"headRefOid",
	"headRefName",
	"baseRefName",
	"updatedAt",
	"mergedAt",
	"closedAt",
	"commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }",
].join(" ");

export const chunked = <A>(
	items: ReadonlyArray<A>,
	size: number,
): ReadonlyArray<ReadonlyArray<A>> => {
	const chunks: Array<ReadonlyArray<A>> = [];
	for (let start = 0; start < items.length; start += size) {
		chunks.push(items.slice(start, start + size));
	}
	return chunks;
};

const repoKey = (ref: PullRequestRef): string => `${ref.owner}/${ref.name}`;

const groupedByRepo = (
	refs: ReadonlyArray<PullRequestRef>,
): ReadonlyArray<ReadonlyArray<PullRequestRef>> => {
	const groups = new Map<string, Array<PullRequestRef>>();
	for (const ref of refs) {
		const key = repoKey(ref);
		const group = groups.get(key);
		if (group === undefined) {
			groups.set(key, [ref]);
			continue;
		}
		group.push(ref);
	}
	return [...groups.values()];
};

// why: every pull request in the batch gets an alias unique across the whole
// document, so nothing has to be matched back by position — each answered node
// carries its own number, and a missing one is simply absent.
const repositoryBlock = (
	group: ReadonlyArray<PullRequestRef>,
	alias: string,
	numbered: (ref: PullRequestRef) => string,
): string => {
	const first = group[0];
	if (first === undefined) {
		return "";
	}
	const selections = group.map(numbered).join(" ");
	return `${alias}: repository(owner: "${first.owner}", name: "${first.name}") { ${selections} }`;
};

export const buildObserveQuery = (
	refs: ReadonlyArray<PullRequestRef>,
): string => {
	let index = 0;
	const numbered = (ref: PullRequestRef): string => {
		const selection = `pr_${index}: pullRequest(number: ${ref.number}) { ${PULL_FIELDS} }`;
		index += 1;
		return selection;
	};
	const blocks = groupedByRepo(refs).map((group, position) =>
		repositoryBlock(group, `r_${position}`, numbered),
	);
	return `query { ${blocks.join(" ")} }`;
};
