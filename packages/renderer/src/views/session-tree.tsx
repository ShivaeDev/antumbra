import type { SessionTree } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SessionTreeRow } from "#views/session-tree-node.tsx";

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
}) => {
	const [open, setOpen] = useState(false);
	const nodes = tree?.nodes ?? [];
	const delegated = nodes.filter((node) => node.depth > 0);
	if (error === undefined && delegated.length === 0) {
		return null;
	}
	const Chevron = open ? ChevronDown : ChevronRight;
	const openCount = delegated.filter((node) => node.status === "open").length;
	const subsessionWord = delegated.length === 1 ? "subsession" : "subsessions";
	return (
		<section className="flex max-h-48 shrink-0 flex-col overflow-y-auto border-b border-border px-2 py-1">
			{error === undefined ? null : <p className="px-1.5 py-1 text-2xs text-destructive">feed lost: {error}</p>}
			{delegated.length === 0 ? null : (
				<button
					aria-expanded={open}
					className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-2xs transition-colors hover:bg-accent"
					onClick={() => setOpen(!open)}
					type="button"
				>
					<Chevron className="size-3 shrink-0 text-muted-foreground" />
					<span className="truncate">
						{delegated.length} {subsessionWord} · {openCount} open
					</span>
				</button>
			)}
			{open
				? nodes.map((node) => (
						<SessionTreeRow
							key={node.id}
							node={node.depth === 0 ? { ...node, displayName: rootName } : node}
							onSelect={onSelect}
							selected={selected}
						/>
					))
				: null}
		</section>
	);
};
