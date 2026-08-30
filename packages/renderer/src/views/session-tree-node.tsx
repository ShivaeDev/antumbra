import type { SessionTreeNode } from "@antumbra/contract";
import { cn } from "#lib/utils.ts";
import { CompletenessBadge, OutcomeBadge, StatusBadge } from "#views/session-tree-badges.tsx";

// why: indentation is drawn from the depth the walk found, and it stops after
// four steps. A tree deep enough to run out of steps has already told the
// reader what it is, and squeezing the name to keep indenting would cost more
// than the nesting is worth.
const INDENTS = ["pl-1.5", "pl-4", "pl-6", "pl-8", "pl-10"] as const;

const indentOf = (depth: number): string => INDENTS[Math.min(depth, INDENTS.length - 1)] ?? INDENTS[0];

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
		<StatusBadge status={node.status} />
		<OutcomeBadge outcome={node.outcome} />
		<CompletenessBadge completeness={node.completeness} />
	</button>
);
