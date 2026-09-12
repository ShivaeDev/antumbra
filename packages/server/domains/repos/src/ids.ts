import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const RepoId = Id.brand("RepoId");
export type RepoId = typeof RepoId.Type;

export const repoReferenceId = (rulingId: string, repoId: RepoId): string => `${rulingId}/repo/${repoId}`;

const lastSegment = (source: string): string => {
	const trimmed = source.replace(/\/+$/, "").replace(/\.git$/, "");
	return trimmed.split(/[/:]/).at(-1) ?? "";
};

export const repoName = (source: string): string => {
	const last = lastSegment(source);
	return last === "" ? "repo" : last;
};

export const repoSlug = (source: string): string => {
	const slug = lastSegment(source)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug === "" ? "repo" : slug;
};
