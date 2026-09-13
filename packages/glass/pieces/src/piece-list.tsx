import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { SectionHeading } from "@antumbra/glass-components/compositions/section-heading.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@antumbra/glass-components/shadcn/dialog.tsx";
import { type ReactNode, useState } from "react";
import { CharterPiece } from "#charter-piece.tsx";
import type { PieceDisplayActions, PiecesDisplayApi } from "#display.ts";
import { PieceCard } from "#piece-card.tsx";

const NOTHING = "Nothing is chartered yet; charter a piece to give the voyage work.";

const CHARTERING = "A piece needs a title, the charter it works to, and the role that carries it. Name what it waits on to place it in the ladder.";

const Chartering = (props: { readonly api: PiecesDisplayApi; readonly voyageId: string }) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Charter piece
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Charter a piece</DialogTitle>
					<DialogDescription>{CHARTERING}</DialogDescription>
				</DialogHeader>
				<CharterPiece api={props.api} onChartered={() => setOpen(false)} voyageId={props.voyageId} />
			</DialogContent>
		</Dialog>
	);
};

export const PieceList = (
	props: PieceDisplayActions & {
		readonly api: PiecesDisplayApi;
		readonly voyageId: string;
		readonly selected?: string | undefined;
		readonly onSelect: (pieceId: string | null) => void;
		readonly children?: ReactNode;
	},
) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.pieces.displayByVoyage}>
		{(pieces) => (
			<SectionHeading action={<Chartering api={props.api} voyageId={props.voyageId} />} collapsible count={pieces.length} open title="Board">
				<div className="flex min-w-0 flex-col gap-3">
					{pieces.length === 0 ? <p className="text-xs text-muted-foreground">{NOTHING}</p> : null}
					{pieces.map((piece) => (
						<PieceCard {...props} key={piece.id} piece={piece} selected={piece.id === props.selected} />
					))}
					{props.children}
				</div>
			</SectionHeading>
		)}
	</Live>
);
