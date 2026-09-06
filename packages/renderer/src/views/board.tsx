import type { BoardEntryView, BoardSmoothing, BoardTarget, PieceView } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { BoardComposer } from "#views/board-composer.tsx";
import { BoardNodes } from "#views/board-nodes.tsx";
import { SmoothingLine, SmoothNow } from "#views/board-smoothing.tsx";
import { Section } from "#views/section.tsx";
import { boardTree } from "#voyages/board-tree.ts";

const EXPLAINER = "Entries newest first; open a summary to see the entries behind it.";

const NO_ENTRIES = "No entries yet; agents write here as they work";

const NO_SUMMARY: Readonly<Record<BoardTarget["kind"], string>> = {
	piece: "No summary yet; one is written when the Piece completes",
	voyage: "No summary yet; one is written at the end of each day or when you smooth now",
};

export const BoardPanel = ({
	entries,
	name,
	onPiece,
	onSmooth,
	pieces = [],
	scope,
	smoothing,
}: {
	readonly entries: ReadonlyArray<BoardEntryView>;
	readonly name: string;
	readonly onPiece?: (pieceId: string) => void;
	readonly onSmooth?: () => void;
	readonly pieces?: ReadonlyArray<PieceView>;
	readonly scope: BoardTarget;
	readonly smoothing?: BoardSmoothing;
}) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	const pass = smoothing === undefined || onSmooth === undefined ? null : { onSmooth, smoothing };
	const smoothed = entries.some((entry) => entry.kind === "summary");
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
			{open && entries.length === 0 ? <p className="text-2xs text-muted-foreground">{NO_ENTRIES}</p> : null}
			{open && entries.length > 0 ? (
				<>
					<p className="text-2xs text-muted-foreground">{EXPLAINER}</p>
					{smoothed ? null : <p className="text-2xs text-muted-foreground">{NO_SUMMARY[scope.kind]}</p>}
					<BoardNodes boardName={name} depth={0} nodes={boardTree(entries)} pieces={{ known: pieces, onOpen: onPiece }} />
				</>
			) : null}
			{open ? <BoardComposer scope={scope} /> : null}
		</Section>
	);
};
