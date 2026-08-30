import type { PieceView } from "@antumbra/contract";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "#components/ui/badge.tsx";
import { Card } from "#components/ui/card.tsx";
import { cn } from "#lib/utils.ts";
import { plainLine } from "#views/markdown-plain.ts";
import { PieceDetail } from "#views/piece-detail.tsx";
import { pieceStateLabel } from "#voyages/labels.ts";
import { pieceTone } from "#voyages/tone.ts";

// why: a voyage is read as the list of its pieces, so a piece states itself in
// one line — what it is called, whose work it is, where it stands — and keeps
// its charter, its outcomes and the acts it offers one click away.
export const PieceCard = ({
	onError,
	piece,
	pieces,
	selected,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly selected: boolean;
}) => {
	const [open, setOpen] = useState(selected);
	const header = useRef<HTMLButtonElement>(null);
	// why: the card another page pointed the console at opens itself and comes
	// into view, so the reader lands on the piece rather than on a voyage they
	// then have to search for it in. Closing it again is theirs to do.
	useEffect(() => {
		if (!selected) {
			return;
		}
		setOpen(true);
		header.current?.scrollIntoView({ block: "nearest" });
	}, [selected]);
	const Chevron = open ? ChevronDown : ChevronRight;
	const preview = plainLine(piece.charter);
	return (
		<Card className="gap-0 p-0">
			<button
				aria-expanded={open}
				className={cn(
					"flex w-full min-w-0 items-start gap-1.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40",
					open && "rounded-b-none",
				)}
				onClick={() => setOpen(!open)}
				ref={header}
				title={open ? "Hide this piece" : "Show this piece"}
				type="button"
			>
				<Chevron className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex min-w-0 items-baseline gap-1.5">
						<span className="min-w-0 truncate text-xs font-medium">
							{piece.title}
						</span>
						<span className="shrink-0 text-2xs text-muted-foreground">
							{piece.role}
						</span>
					</span>
					{preview === "" ? null : (
						<span className="min-w-0 truncate text-2xs text-muted-foreground">
							{preview}
						</span>
					)}
				</span>
				<Badge variant={pieceTone[piece.state]}>
					{pieceStateLabel[piece.state]}
				</Badge>
			</button>
			{open ? (
				<PieceDetail onError={onError} piece={piece} pieces={pieces} />
			) : null}
		</Card>
	);
};
