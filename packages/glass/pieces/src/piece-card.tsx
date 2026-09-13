import type { displayByVoyage } from "@antumbra/domain-pieces/queries/display-by-voyage.ts";
import { cn } from "@antumbra/glass-components/class-names.ts";
import { plainLine } from "@antumbra/glass-components/markdown-plain.ts";
import { Card } from "@antumbra/glass-components/shadcn/card.tsx";
import { ChevronRightIcon } from "lucide-react";
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
	const preview = plainLine(props.piece.charter);
	return (
		<Card className="gap-0 overflow-hidden py-0">
			<button
				aria-current={props.selected ? "true" : undefined}
				aria-expanded={props.selected}
				aria-label={`Open ${props.piece.title}`}
				className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60"
				onClick={() => props.onSelect(props.selected ? null : props.piece.id)}
				ref={header}
				type="button"
			>
				<ChevronRightIcon className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", props.selected && "rotate-90")} />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex min-w-0 items-center gap-2">
						<span className="min-w-0 truncate text-sm font-medium">{props.piece.title}</span>
						<span className="shrink-0 text-xs text-muted-foreground">{props.piece.role}</span>
					</span>
					{preview === "" ? null : <span className="min-w-0 truncate text-xs text-muted-foreground">{preview}</span>}
				</span>
				<PieceState state={props.piece.state} />
			</button>
			{props.selected ? <PieceDetail {...props} pieceId={props.piece.id} /> : null}
		</Card>
	);
};
