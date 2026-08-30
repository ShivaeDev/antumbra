import type { SessionTreeNode } from "@antumbra/contract";
import { cn } from "#lib/utils.ts";
import { outcomeWords } from "#views/session-outcome-words.ts";

const INDENTS = ["pl-1.5", "pl-4", "pl-6", "pl-8", "pl-10"] as const;

const indentOf = (depth: number): string => INDENTS[Math.min(depth, INDENTS.length - 1)] ?? INDENTS[0];

const stateOf = (node: SessionTreeNode): string => {
	let state = "Open";
	if (node.status === "closed") {
		state = node.outcome === null ? "Closed" : outcomeWords[node.outcome];
	}
	return node.completeness === "incomplete" ? `${state} · Record incomplete` : state;
};

export const SessionTreeRow = ({
	node,
	onSelect,
	selected,
}: {
	readonly node: SessionTreeNode;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string;
}) => (
	<button
		aria-current={node.id === selected ? "true" : undefined}
		className={cn(
			"flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-1.5 text-left transition-colors hover:bg-accent",
			indentOf(node.depth),
			node.id === selected ? "bg-secondary" : undefined,
		)}
		onClick={() => onSelect(node.id)}
		type="button"
	>
		<span className="min-w-0 flex-1 truncate text-2xs">{node.displayName}</span>
		<span className="shrink-0 text-2xs text-muted-foreground">{stateOf(node)}</span>
	</button>
);
