import { createHash } from "node:crypto";

const baseName = (source: string): string => {
	const trimmed = source.replace(/\/+$/, "").replace(/\.git$/, "");
	const last = trimmed.split(/[/:]/).at(-1) ?? "";
	const slug = last
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug === "" ? "repo" : slug;
};

// why: two different sources can share a basename — the mirror name carries a
// source hash so they never share a mirror.
export const mirrorName = (source: string): string =>
	`${baseName(source)}-${createHash("sha256").update(source).digest("hex").slice(0, 8)}.git`;

export const berthSlug = (
	source: string,
	taken: ReadonlySet<string>,
): string => {
	const base = baseName(source);
	if (!taken.has(base)) {
		return base;
	}
	let counter = 2;
	while (taken.has(`${base}-${counter}`)) {
		counter += 1;
	}
	return `${base}-${counter}`;
};

export const workBranch = (agentId: string, slug: string): string =>
	`work/${agentId.slice(0, 8)}/${slug}`;
