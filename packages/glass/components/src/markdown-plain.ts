const BLOCK_MARKS: ReadonlyArray<readonly [RegExp, string]> = [
	[/```+[^\n]*/g, " "],
	[/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, " "],
	[/^[ \t]*>[ \t]?/gm, ""],
	[/^[ \t]*#{1,6}[ \t]+/gm, ""],
	[/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, ""],
];

const SPAN_MARKS: ReadonlyArray<readonly [RegExp, string]> = [
	[/!\[([^\]]*)\]\([^)]*\)/g, "$1"],
	[/\[([^\]]*)\]\([^)]*\)/g, "$1"],
	[/\*\*([^*]+)\*\*/g, "$1"],
	[/__([^_]+)__/g, "$1"],
	[/~~([^~]+)~~/g, "$1"],
	[/\*([^*\n]+)\*/g, "$1"],
	[/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1"],
	[/`([^`\n]+)`/g, "$1"],
];

export const plainLine = (markdown: string): string =>
	[...BLOCK_MARKS, ...SPAN_MARKS]
		.reduce((text, [mark, plain]) => text.replaceAll(mark, plain), markdown)
		.replaceAll(/\s+/g, " ")
		.trim();
