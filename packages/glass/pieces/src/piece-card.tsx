import type { displayByVoyage } from "@antumbra/domain-pieces/queries/display-by-voyage.ts";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { SUBJECT } from "@antumbra/glass-components/classes.ts";
import { plainLine } from "@antumbra/glass-components/markdown-plain.ts";
import { Card } from "@antumbra/glass-components/ui/card.tsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PieceDisplayActions, PiecesDisplayApi } from "#display.ts";
import { PieceDetail } from "#piece-detail.tsx";
import { PieceState } from "#state.tsx";

type Piece = (typeof displayByVoyage.output.Type)[number];
export const PieceCard = (
	props: PieceDisplayActions & {
		readonly api: PiecesDisplayApi;
		readonly piece: Piece;
		readonly selected: boolean;
		readonly onSelect: (pieceId: string | null) => void;
	},
) => {
	const header = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (props.selected) header.current?.scrollIntoView({ block: "nearest" });
	}, [props.selected]);
	const Chevron = props.selected ? ChevronDown : ChevronRight;
	const preview = plainLine(props.piece.charter);
	return (
		<Card className={cn("gap-0 p-0 transition-colors", props.selected ? "border-border-strong" : "hover:border-border-strong")}>
			<button
				aria-current={props.selected ? "true" : undefined}
				aria-expanded={props.selected}
				aria-label={`Open ${props.piece.title}`}
				className={cn(SUBJECT, "w-full flex-row items-start gap-1.5 px-2.5 py-2")}
				onClick={() => props.onSelect(props.selected ? null : props.piece.id)}
				ref={header}
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
			{props.selected ? <PieceDetail {...props} pieceId={props.piece.id} /> : null}
		</Card>
	);
};
