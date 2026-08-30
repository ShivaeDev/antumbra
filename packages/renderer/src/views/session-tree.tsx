import type { SessionTree } from "@antumbra/contract";
import { SessionTreeRow } from "#views/session-tree-node.tsx";

// why: the tree is what a Session delegated, and it is shown above the words
// so a reader meets the shape of the work before reading any one part of it.
// Every node is a click target, the root included, so there is always a way
// back out of a branch.
// why: the display rule names subsessions from what a provider stored about
// them, and the root is not one — it is the Agent's own Session, so it wears
// the name the Agent wears everywhere else rather than the rule's last resort.
export const SessionTreePanel = ({
	error,
	onSelect,
	rootName,
	selected,
	tree,
}: {
	readonly error: string | undefined;
	readonly onSelect: (sessionId: string) => void;
	readonly rootName: string;
	readonly selected: string;
	readonly tree: SessionTree | undefined;
}) => (
	<section className="flex max-h-48 shrink-0 flex-col overflow-y-auto border-b border-border px-2 py-2">
		<div className="flex min-w-0 items-baseline gap-2 px-1.5 pb-1">
			<span className="shrink-0 text-2xs font-medium">session tree</span>
			<span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
				{tree === undefined ? "reading" : `${tree.alive} of ${tree.total} open`}
			</span>
		</div>
		{error === undefined ? null : <p className="px-1.5 pb-1 text-2xs text-destructive">feed lost: {error}</p>}
		{tree?.nodes.map((node) => (
			<SessionTreeRow key={node.id} node={node.depth === 0 ? { ...node, displayName: rootName } : node} onSelect={onSelect} selected={selected} />
		))}
	</section>
);
