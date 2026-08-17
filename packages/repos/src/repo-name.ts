export const repoName = (source: string): string => {
	const trimmed = source.replace(/\/+$/, "").replace(/\.git$/, "");
	const last = trimmed.split(/[/:]/).at(-1) ?? "";
	return last === "" ? "repo" : last;
};
