import type { displayByVoyage } from "@antumbra/domain-pieces/queries/display-by-voyage.ts";
import { plainLine } from "@antumbra/glass-components/markdown-plain.ts";
import { Card } from "@antumbra/glass-components/ui/card.tsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PieceDisplayActions, PiecesDisplayApi } from "#display.ts";
import { PieceDetail } from "#piece-detail.tsx";
import { PieceState } from "#state.tsx";

type Piece = (typeof displayByVoyage.output.Type)[number];
export const PieceCard = (props: PieceDisplayActions & { readonly api: PiecesDisplayApi; readonly piece: Piece; readonly selected: boolean }) => {
	const [open, setOpen] = useState(props.selected);
	const header = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (props.selected) {
			setOpen(true);
			header.current?.scrollIntoView({ block: "nearest" });
		}
	}, [props.selected]);
	const Chevron = open ? ChevronDown : ChevronRight;
	const preview = plainLine(props.piece.charter);
	return (
		<Card className="gap-0 p-0">
			<button
				aria-expanded={open}
				className="flex w-full min-w-0 items-start gap-1.5 rounded-lg px-2.5 py-2 text-left hover:bg-accent"
				onClick={() => setOpen(!open)}
				ref={header}
				title={open ? "Hide this piece" : "Show this piece"}
				type="button"
			>
				<Chevron className="mt-0.5 size-3 shrink-0" />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex gap-1.5">
						<span className="text-xs font-medium">{props.piece.title}</span>
						<span className="text-2xs text-muted-foreground">{props.piece.role}</span>
					</span>
					{preview === "" ? null : <span className="truncate text-2xs text-muted-foreground">{preview}</span>}
				</span>
				<PieceState state={props.piece.state} />
			</button>
			{open ? <PieceDetail {...props} pieceId={props.piece.id} /> : null}
		</Card>
	);
};
