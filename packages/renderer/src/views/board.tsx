import type { BoardEntryView, BoardSmoothing, BoardTarget, PieceView } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import { BoardComposer } from "#views/board-composer.tsx";
import { SmoothingLine, SmoothNow } from "#views/board-smoothing.tsx";
import { MarkdownView } from "#views/markdown-view.tsx";
import { Section } from "#views/section.tsx";
import { boardEntryLabels, whenLabel } from "#voyages/labels.ts";
import { bySalience } from "#voyages/order.ts";

const PieceLink = ({
	onPiece,
	pieceId,
	pieces,
}: {
	readonly onPiece: ((pieceId: string) => void) | undefined;
	readonly pieceId: string;
	readonly pieces: ReadonlyArray<PieceView>;
}) => {
	const title = pieces.find((piece) => piece.id === pieceId)?.title ?? pieceId;
	return onPiece === undefined ? (
		<span className="min-w-0 text-xs font-medium">{title}</span>
	) : (
		<Button
			className="h-auto min-w-0 justify-start whitespace-normal p-0 text-left text-xs font-medium"
			onClick={() => onPiece(pieceId)}
			title="Open this piece"
			type="button"
			variant="link"
		>
			{title}
		</Button>
	);
};

const EntryRow = ({
	entry,
	onPiece,
	pieces,
}: {
	readonly entry: BoardEntryView;
	readonly onPiece: ((pieceId: string) => void) | undefined;
	readonly pieces: ReadonlyArray<PieceView>;
}) => {
	const smooth = entry.register === "smooth";
	const labels = boardEntryLabels(entry);
	return (
		<li className={cn("flex min-w-0 flex-col gap-1 rounded-md border px-2.5 py-2", smooth ? "border-border bg-card" : "border-transparent")}>
			<div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
				<Badge variant={smooth ? "info" : "outline"}>{labels.kind}</Badge>
				<span className={cn("min-w-0 truncate", labels.named ? "font-mono" : null)}>{labels.author}</span>
				<span className="ml-auto shrink-0 tabular-nums">{whenLabel(entry.createdAt)}</span>
			</div>
			{entry.pieceId === null ? null : <PieceLink onPiece={onPiece} pieceId={entry.pieceId} pieces={pieces} />}
			<MarkdownView className={smooth || entry.pieceId !== null ? "text-xs" : "text-2xs text-muted-foreground"} markdown={entry.body} />
		</li>
	);
};

export const BoardPanel = ({
	entries,
	onPiece,
	onSmooth,
	pieces = [],
	scope,
	smoothing,
}: {
	readonly entries: ReadonlyArray<BoardEntryView>;
	readonly onPiece?: (pieceId: string) => void;
	readonly onSmooth?: () => void;
	readonly pieces?: ReadonlyArray<PieceView>;
	readonly scope: BoardTarget;
	readonly smoothing?: BoardSmoothing;
}) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	const pass = smoothing === undefined || onSmooth === undefined ? null : { onSmooth, smoothing };
	return (
		<Section>
			<div className="flex min-w-0 items-center gap-2 border-b border-border pb-1.5">
				<button
					aria-expanded={open}
					className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
					onClick={() => setOpen(!open)}
					title={open ? "Hide the board" : "Show the board"}
					type="button"
				>
					<Chevron className="size-3 shrink-0 text-muted-foreground" />
					<span className="min-w-0 truncate text-xs font-medium">Board</span>
					<span className="text-2xs text-muted-foreground tabular-nums">{entries.length}</span>
				</button>
				{pass === null ? null : <SmoothNow onSmooth={pass.onSmooth} smoothing={pass.smoothing} />}
			</div>
			{pass === null ? null : <SmoothingLine onSmooth={pass.onSmooth} smoothing={pass.smoothing} />}
			{open && entries.length === 0 ? <p className="text-2xs text-muted-foreground">Nothing written yet — the crew and you both write here</p> : null}
			{open && entries.length > 0 ? (
				<ul className="flex min-w-0 flex-col gap-1">
					{bySalience(entries).map((entry) => (
						<EntryRow entry={entry} key={entry.id} onPiece={onPiece} pieces={pieces} />
					))}
				</ul>
			) : null}
			{open ? <BoardComposer scope={scope} /> : null}
		</Section>
	);
};
