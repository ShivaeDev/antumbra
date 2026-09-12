import type { BoardNode } from "@antumbra/domain-boards/queries/display.ts";

const counted = (count: number, word: string, plural = `${word}s`): string => `${count} ${count === 1 ? word : plural}`;
const entryCount = (nodes: readonly BoardNode[]): number =>
	nodes.reduce((total, node) => total + (node.entry.kind === "summary" ? entryCount(node.children) : 1), 0);
export const coveredLabel = (nodes: readonly BoardNode[]): string => {
	const levels = nodes.filter((node) => node.entry.kind === "summary").map((node) => node.entry.level);
	const groups = (["day", "piece"] as const)
		.filter((level) => levels.includes(level))
		.map((level) => counted(levels.filter((value) => value === level).length, level));
	return [...groups, counted(entryCount(nodes), "entry", "entries")].join(" · ");
};
export const summaryTitle = (node: BoardNode, name: string): string =>
	node.entry.level === "piece" ? `Piece summary · ${name}` : `Day summary · ${(node.children.at(-1)?.entry ?? node.entry).createdAt.slice(0, 10)}`;
