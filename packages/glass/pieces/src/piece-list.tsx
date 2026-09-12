import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { Section, SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { CharterPiece } from "#charter-piece.tsx";
import type { PieceDisplayActions, PiecesDisplayApi } from "#display.ts";
import { PieceCard } from "#piece-card.tsx";

const Chartering = (props: { readonly api: PiecesDisplayApi; readonly voyageId: string }) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<PlusIcon />
					Charter piece
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Charter a piece</DialogTitle>
					<DialogDescription>
						A piece needs a title, the charter it works to, and the role that carries it. Name what it waits on to place it in the ladder.
					</DialogDescription>
				</DialogHeader>
				<CharterPiece api={props.api} onChartered={() => setOpen(false)} voyageId={props.voyageId} />
			</DialogContent>
		</Dialog>
	);
};

export const PieceList = (
	props: PieceDisplayActions & { readonly api: PiecesDisplayApi; readonly voyageId: string; readonly selected?: string | undefined },
) => (
	<Live input={{ voyageId: VoyageId.make(props.voyageId) }} query={props.api.pieces.displayByVoyage}>
		{(pieces) => (
			<Section>
				<SectionHeading action={<Chartering api={props.api} voyageId={props.voyageId} />} count={pieces.length} title="Pieces" />
				{pieces.length === 0 ? (
					<p className="text-2xs text-muted-foreground">Nothing chartered yet — charter a piece to give the voyage work</p>
				) : null}
				<ul className="flex min-w-0 flex-col gap-2">
					{pieces.map((piece) => (
						<li key={piece.id}>
							<PieceCard {...props} piece={piece} selected={piece.id === props.selected} />
						</li>
					))}
				</ul>
			</Section>
		)}
	</Live>
);
