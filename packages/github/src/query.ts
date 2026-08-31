import type { PullRequestRef } from "#pull-url.ts";
import type { GitHubRepoName } from "#source.ts";

export interface LocatedPullRequestRef extends PullRequestRef {
	readonly repoId: string;
}

export interface ObserveSelection {
	readonly pullAlias: string;
	readonly ref: LocatedPullRequestRef;
	readonly repoAlias: string;
}

interface ObservePlan {
	readonly query: string;
	readonly selections: ReadonlyArray<ObserveSelection>;
}

// Leave ample room beneath GitHub's GraphQL node limit.
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
	"commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }",
].join(" ");

export const chunked = <A>(items: ReadonlyArray<A>, size: number): ReadonlyArray<ReadonlyArray<A>> => {
	const chunks: Array<ReadonlyArray<A>> = [];
	for (let start = 0; start < items.length; start += size) {
		chunks.push(items.slice(start, start + size));
	}
	return chunks;
};

const repoKey = (ref: PullRequestRef): string => `${ref.owner}/${ref.name}`;

interface RepositoryGroup extends GitHubRepoName {
	readonly refs: Array<LocatedPullRequestRef>;
}

const groupedByRepo = (refs: ReadonlyArray<LocatedPullRequestRef>): ReadonlyArray<RepositoryGroup> => {
	const groups = new Map<string, RepositoryGroup>();
	for (const ref of refs) {
		const key = repoKey(ref);
		const group = groups.get(key);
		if (group === undefined) {
			groups.set(key, { name: ref.name, owner: ref.owner, refs: [ref] });
			continue;
		}
		group.refs.push(ref);
	}
	return [...groups.values()];
};

export const buildObservePlan = (refs: ReadonlyArray<LocatedPullRequestRef>): ObservePlan => {
	let index = 0;
	const selections: ObserveSelection[] = [];
	const blocks = groupedByRepo(refs).map((group, position) => {
		const repoAlias = `r_${position}`;
		const numbered = group.refs.map((ref) => {
			const pullAlias = `pr_${index}`;
			selections.push({ pullAlias, ref, repoAlias });
			const selection = `${pullAlias}: pullRequest(number: ${ref.number}) { ${PULL_FIELDS} }`;
			index += 1;
			return selection;
		});
		return `${repoAlias}: repository(owner: "${group.owner}", name: "${group.name}") { ${numbered.join(" ")} }`;
	});
	return { query: `query { ${blocks.join(" ")} }`, selections };
};
