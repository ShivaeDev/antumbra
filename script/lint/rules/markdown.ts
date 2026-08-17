import { dirname, join, normalize } from "node:path/posix";
import type { TextFile } from "#lint/inventory.ts";

export interface MarkdownLink {
	readonly line: number;
	readonly target: string;
}

const LINK = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
const REFERENCE = /(?<!!)\[([^\]]+)\]\[([^\]]*)\]/g;
const REFERENCE_DEFINITION = /^[ \t]{0,3}\[([^\]]+)\]:\s*(\S.*)$/;
const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;

interface MarkdownLine {
	readonly line: number;
	readonly raw: string;
}

const destination = (raw: string): string => {
	const trimmed = raw.trim();
	if (trimmed.startsWith("<")) {
		return trimmed.slice(1, trimmed.indexOf(">"));
	}
	return trimmed.split(/\s+['"]/)[0] ?? "";
};

const withoutInlineCode = (line: string): string => {
	let result = "";
	let cursor = 0;
	while (cursor < line.length) {
		if (line[cursor] !== "`") {
			result += line[cursor];
			cursor += 1;
			continue;
		}
		let length = 1;
		while (line[cursor + length] === "`") length += 1;
		const marker = "`".repeat(length);
		const closing = line.indexOf(marker, cursor + length);
		if (closing === -1) {
			result += marker;
			cursor += length;
			continue;
		}
		result += " ".repeat(closing + length - cursor);
		cursor = closing + length;
	}
	return result;
};

const markdownLines = (
	document: TextFile,
	stripInlineCode: boolean,
): readonly MarkdownLine[] => {
	const lines: MarkdownLine[] = [];
	let fence: string | undefined;
	document.raw.split("\n").forEach((raw, index) => {
		if (fence !== undefined) {
			const closing = raw.trim();
			const fenceCharacter = fence.charAt(0);
			if (
				closing.length >= fence.length &&
				[...closing].every((character) => character === fenceCharacter)
			) {
				fence = undefined;
			}
			return;
		}
		const opening = FENCE.exec(raw)?.[1];
		if (opening !== undefined) {
			fence = opening;
			return;
		}
		lines.push({
			line: index + 1,
			raw: stripInlineCode ? withoutInlineCode(raw) : raw,
		});
	});
	return lines;
};

export const markdownProseLines = (
	document: TextFile,
): readonly MarkdownLine[] => markdownLines(document, true);

const referenceKey = (label: string): string =>
	label.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export const linksOf = (document: TextFile): readonly MarkdownLink[] => {
	const lines = markdownProseLines(document);
	const definitions = new Map<string, string>();
	for (const line of lines) {
		const definition = REFERENCE_DEFINITION.exec(line.raw);
		if (definition !== null) {
			definitions.set(
				referenceKey(definition[1] ?? ""),
				destination(definition[2] ?? ""),
			);
		}
	}
	return lines.flatMap((line) => [
		...[...line.raw.matchAll(LINK)].map((match) => ({
			line: line.line,
			target: destination(match[1] ?? ""),
		})),
		...[...line.raw.matchAll(REFERENCE)].flatMap((match) => {
			const label = match[1] ?? "";
			const key = referenceKey(match[2] === "" ? label : (match[2] ?? ""));
			const target = definitions.get(key);
			return target === undefined ? [] : [{ line: line.line, target }];
		}),
	]);
};

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
		markdownLines(document, false).flatMap((line) => {
			const match = HEADING.exec(line.raw);
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
