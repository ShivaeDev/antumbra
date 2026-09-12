import type { BoardNode } from "@antumbra/domain-boards/queries/display.ts";
import type { boardEntry } from "@antumbra/domain-boards/rows/board-entry.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { MarkdownView } from "@antumbra/glass-components/markdown-view.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { type ReactNode, useState } from "react";
import type { BoardDisplayApi } from "#display.ts";
import { coveredLabel, summaryTitle } from "#summary-labels.ts";

type Entry = typeof boardEntry.Row.Type;

const author = (entry: Entry): string => (entry.kind !== "note" ? "Smoother" : (entry.authorAgentId ?? "you"));

const PieceLink = (props: {
	readonly api: BoardDisplayApi;
	readonly entry: Entry;
	readonly onPiece: ((pieceId: string) => void) | undefined;
}): ReactNode => {
	const id = props.entry.pieceId;
	if (id === null) return null;
	return (
		<Live input={{ id }} query={props.api.pieces.byId}>
			{(piece) =>
				props.onPiece === undefined ? (
					<p className="text-xs font-medium">{piece?.title ?? id}</p>
				) : (
					<Button onClick={() => props.onPiece?.(id)} title="Open this piece" variant="link">
						{piece?.title ?? id}
					</Button>
				)
			}
		</Live>
	);
};

type NodesProps = {
	readonly api: BoardDisplayApi;
	readonly depth: number;
	readonly nodes: readonly BoardNode[];
	readonly name: string;
	readonly onPiece: ((pieceId: string) => void) | undefined;
};

const CoveredEntries = (props: NodesProps): ReactNode => {
	const [open, setOpen] = useState(false);
	const label = coveredLabel(props.nodes);
	if (props.depth >= 3) return <p className="text-2xs text-muted-foreground">{label}</p>;
	return (
		<div>
			<button aria-expanded={open} className="cursor-pointer text-2xs text-muted-foreground" onClick={() => setOpen(!open)} type="button">
				{label}
			</button>
			{open ? <BoardNodes {...props} depth={props.depth + 1} /> : null}
		</div>
	);
};

export const BoardNodes = (props: NodesProps): ReactNode => (
	<ul className="flex min-w-0 flex-col gap-3">
		{props.nodes.map((node) => {
			const entry = node.entry;
			return (
				<li className="flex min-w-0 flex-col gap-1" key={entry.id}>
					{entry.kind === "summary" ? <h3 className="text-xs font-medium">{summaryTitle(node, props.name)}</h3> : null}
					{entry.kind === "pieceSummary" ? <h3 className="text-xs font-medium">Piece summary</h3> : null}
					{entry.kind === "note" && entry.register === "smooth" ? <h3 className="text-xs font-medium">Note</h3> : null}
					<div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
						<span>{author(entry)}</span>
						<time className="ml-auto tabular-nums" dateTime={entry.createdAt}>
							{entry.createdAt.slice(0, 16).replace("T", " ")}
						</time>
					</div>
					{entry.kind === "pieceSummary" ? <PieceLink api={props.api} entry={entry} onPiece={props.onPiece} /> : null}
					<MarkdownView className={entry.register === "rough" ? "text-2xs text-muted-foreground" : "max-w-[72ch] text-sm"} markdown={entry.body} />
					{entry.kind === "summary" ? <CoveredEntries {...props} nodes={node.children} /> : null}
				</li>
			);
		})}
	</ul>
);
