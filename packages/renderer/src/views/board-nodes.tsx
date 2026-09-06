import type { BoardSummaryView } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "#lib/utils.ts";
import { Block, type BoardPieces, EntryRow, PieceSummaryBlock, SMOOTHER } from "#views/board-entry.tsx";
import type { BoardNode } from "#voyages/board-tree.ts";
import { authorLabel, boardEntryKindLabel, summaryCoveredLabel, summaryHeadingLabel } from "#voyages/labels.ts";

const NESTING_CAP = 3;

const SummaryBlock = ({
	boardName,
	covered,
	depth,
	pieces,
	summary,
}: {
	readonly boardName: string;
	readonly covered: ReadonlyArray<BoardNode>;
	readonly depth: number;
	readonly pieces: BoardPieces;
	readonly summary: BoardSummaryView;
}) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	const count = summaryCoveredLabel(covered);
	return (
		<Block author={SMOOTHER} entry={summary} heading={summaryHeadingLabel(summary, covered, boardName)} mono={false}>
			{depth < NESTING_CAP ? (
				<button
					aria-expanded={open}
					className="flex min-w-0 items-center gap-1.5 self-start text-2xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
					onClick={() => setOpen(!open)}
					type="button"
				>
					<Chevron className="size-3 shrink-0" />
					{count}
				</button>
			) : (
				<p className="text-2xs text-muted-foreground">{count}</p>
			)}
			{open ? <BoardNodes boardName={boardName} depth={depth + 1} nodes={covered} pieces={pieces} /> : null}
		</Block>
	);
};

const BoardNodeItem = ({
	boardName,
	depth,
	node,
	pieces,
}: {
	readonly boardName: string;
	readonly depth: number;
	readonly node: BoardNode;
	readonly pieces: BoardPieces;
}) => {
	const entry = node.entry;
	if (entry.kind === "summary") {
		return <SummaryBlock boardName={boardName} covered={node.children} depth={depth} pieces={pieces} summary={entry} />;
	}
	if (entry.kind === "pieceSummary") {
		return <PieceSummaryBlock entry={entry} pieces={pieces} />;
	}
	if (entry.register === "rough") {
		return <EntryRow entry={entry} />;
	}
	return (
		<Block author={authorLabel(entry.authorAgentId)} entry={entry} heading={boardEntryKindLabel[entry.kind]} mono={entry.authorAgentId !== null} />
	);
};

export const BoardNodes = ({
	boardName,
	depth,
	nodes,
	pieces,
}: {
	readonly boardName: string;
	readonly depth: number;
	readonly nodes: ReadonlyArray<BoardNode>;
	readonly pieces: BoardPieces;
}) => (
	<ul className={cn("flex min-w-0 flex-col gap-3", depth === 0 ? null : "mt-1 border-l border-border pl-5")}>
		{nodes.map((node) => (
			<BoardNodeItem boardName={boardName} depth={depth} key={node.entry.id} node={node} pieces={pieces} />
		))}
	</ul>
);
