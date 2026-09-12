import type { PieceView } from "@antumbra/contract";
import { Section, SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { CharterPiece } from "@antumbra/glass-pieces/charter-piece.tsx";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useGlass } from "#adapters/glass.ts";
import { PieceCard } from "#views/piece-card.tsx";
import { byLadder } from "#voyages/order.ts";

const Chartering = ({ voyageId, onChartered }: { readonly voyageId: string; readonly onChartered: () => void }) => (
	<CharterPiece api={useGlass()} onChartered={onChartered} voyageId={voyageId} />
);

const CharterPieceDialog = ({ voyageId }: { readonly voyageId: string }) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm" type="button" variant="outline">
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
				<Chartering onChartered={() => setOpen(false)} voyageId={voyageId} />
			</DialogContent>
		</Dialog>
	);
};

export const PiecesPanel = ({
	onError,
	pieces,
	selected,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly selected: string | undefined;
	readonly voyageId: string;
}) => (
	<Section>
		<SectionHeading action={<CharterPieceDialog voyageId={voyageId} />} count={pieces.length} title="Pieces" />
		{pieces.length === 0 ? (
			<p className="text-2xs text-muted-foreground">Nothing chartered yet — charter a piece to give the voyage work</p>
		) : (
			<ul className="flex min-w-0 flex-col gap-2">
				{byLadder(pieces).map((piece) => (
					<li className="min-w-0" key={piece.id}>
						<PieceCard onError={onError} piece={piece} pieces={pieces} selected={piece.id === selected} voyageId={voyageId} />
					</li>
				))}
			</ul>
		)}
	</Section>
);
