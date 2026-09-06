export const usage = "usage: pnpm wt new <lane>/<task>";

const segment = "[a-z0-9]+(?:-[a-z0-9]+)*";
const pattern = new RegExp(`^${segment}/${segment}$`);

export const nameError = (raw: string | undefined): string | undefined => {
	if (raw === undefined || raw === "") return usage;
	if (!pattern.test(raw)) return `invalid name "${raw}": expected <lane>/<task> using lowercase letters, digits, and hyphens`;
	if (raw.split("/")[0] === "wt") return `invalid name "${raw}": branches never start with wt/`;
	return undefined;
};

export const newNameError = (args: readonly string[]): string | undefined => {
	if (args.length !== 2 || args[0] !== "new") return usage;
	return nameError(args[1]);
};

export const worktreeRelativePath = (name: string): string => `.worktrees/${name}`;

export const worktreePathForRoot = (root: string, name: string): string => `${root}/.worktrees/${name}`;
