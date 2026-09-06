import type { BoardEntryView, BoardSummaryView } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "#lib/utils.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import type { BoardNode } from "#voyages/board-tree.ts";
import { authorLabel, boardEntryKindLabel, summaryCoveredLabel, summaryHeadingLabel, whenLabel } from "#voyages/labels.ts";

const NESTING_CAP = 3;

const SMOOTHER = "Smoother";

const Meta = ({ author, mono, when }: { readonly author: string; readonly mono: boolean; readonly when: string }) => (
	<div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
		<span className={cn("min-w-0 truncate", mono ? "font-mono" : null)}>{author}</span>
		<span className="ml-auto shrink-0 tabular-nums">{when}</span>
	</div>
);

const EntryRow = ({ entry }: { readonly entry: BoardEntryView }) => (
	<li className="flex min-w-0 flex-col gap-1">
		<Meta author={authorLabel(entry.authorAgentId)} mono={entry.authorAgentId !== null} when={whenLabel(entry.createdAt)} />
		<MarkdownView className="text-2xs text-muted-foreground" markdown={entry.body} />
	</li>
);

const Block = ({
	author,
	children,
	entry,
	heading,
	mono,
}: {
	readonly author: string;
	readonly children?: React.ReactNode;
	readonly entry: BoardEntryView;
	readonly heading: string;
	readonly mono: boolean;
}) => (
	<li className="flex min-w-0 flex-col gap-1">
		<h3 className="min-w-0 truncate text-xs font-medium">{heading}</h3>
		<Meta author={author} mono={mono} when={whenLabel(entry.createdAt)} />
		<MarkdownView className="max-w-[72ch] text-sm" markdown={entry.body} />
		{children}
	</li>
);

const SummaryBlock = ({
	boardName,
	covered,
	depth,
	summary,
}: {
	readonly boardName: string;
	readonly covered: ReadonlyArray<BoardNode>;
	readonly depth: number;
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
			{open ? <BoardNodes boardName={boardName} depth={depth + 1} nodes={covered} /> : null}
		</Block>
	);
};

const BoardNodeItem = ({ boardName, depth, node }: { readonly boardName: string; readonly depth: number; readonly node: BoardNode }) => {
	const entry = node.entry;
	if (entry.kind === "summary") {
		return <SummaryBlock boardName={boardName} covered={node.children} depth={depth} summary={entry} />;
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
}: {
	readonly boardName: string;
	readonly depth: number;
	readonly nodes: ReadonlyArray<BoardNode>;
}) => (
	<ul className={cn("flex min-w-0 flex-col gap-3", depth === 0 ? null : "mt-1 border-l border-border pl-5")}>
		{nodes.map((node) => (
			<BoardNodeItem boardName={boardName} depth={depth} key={node.entry.id} node={node} />
		))}
	</ul>
);
