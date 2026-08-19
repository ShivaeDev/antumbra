const lastSegment = (source: string): string => {
	const trimmed = source.replace(/\/+$/, "").replace(/\.git$/, "");
	return trimmed.split(/[/:]/).at(-1) ?? "";
};

export const repoName = (source: string): string => {
	const last = lastSegment(source);
	return last === "" ? "repo" : last;
};

// why: a berth is a directory and a work branch is a ref, so the registry
// hands both the one lowered spelling of the name it answers to. Nothing
// downstream derives a repository's name a second time.
export const repoSlug = (source: string): string => {
	const slug = lastSegment(source)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug === "" ? "repo" : slug;
};
