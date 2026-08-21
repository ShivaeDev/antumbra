// why: a preview is one line of a description that was written as Markdown.
// The marks in it are instructions to a renderer, not words the author chose,
// so a collapsed card shows the sentence and never the syntax around it.
const BLOCK_MARKS: ReadonlyArray<readonly [RegExp, string]> = [
	[/```+[^\n]*/g, " "],
	[/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, " "],
	[/^[ \t]*>[ \t]?/gm, ""],
	[/^[ \t]*#{1,6}[ \t]+/gm, ""],
	[/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, ""],
];

// why: only a mark that closes is a mark. A lone asterisk or an underscore
// inside a name was never emphasis, and dropping it would rewrite the words
// rather than undress them.
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
