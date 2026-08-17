import { dirname, join, normalize } from "node:path/posix";
import type { TextFile } from "#lint/inventory.ts";

export interface MarkdownLink {
	readonly line: number;
	readonly target: string;
}

const LINK = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;

const destination = (raw: string): string => {
	const trimmed = raw.trim();
	if (trimmed.startsWith("<")) {
		return trimmed.slice(1, trimmed.indexOf(">"));
	}
	return trimmed.split(/\s+['"]/)[0] ?? "";
};

export const linksOf = (document: TextFile): readonly MarkdownLink[] =>
	document.raw.split("\n").flatMap((line, index) =>
		[...line.matchAll(LINK)].map((match) => ({
			line: index + 1,
			target: destination(match[1] ?? ""),
		})),
	);

export const anchor = (heading: string): string =>
	heading
		.replace(/<[^>]*>/g, "")
		.replace(/[`*_~]/g, "")
		.toLocaleLowerCase("en")
		.replace(/[^\p{L}\p{N} _-]/gu, "")
		.trim()
		.replace(/\s+/g, "-");

export const anchorsOf = (document: TextFile): ReadonlySet<string> =>
	new Set(
		document.raw.split("\n").flatMap((line) => {
			const match = HEADING.exec(line);
			return match === null ? [] : [anchor(match[2] ?? "")];
		}),
	);

export const linkPath = (source: string, target: string): string => {
	const path = target.split("#", 1)[0] ?? "";
	return path === "" ? source : normalize(join(dirname(source), path));
};

export const linkAnchor = (target: string): string | undefined => {
	const hash = target.indexOf("#");
	return hash === -1 ? undefined : target.slice(hash + 1);
};

export const isLocalMarkdown = (target: string): boolean => {
	if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) {
		return false;
	}
	const path = target.split("#", 1)[0] ?? "";
	return path === "" || path.toLocaleLowerCase("en").endsWith(".md");
};
