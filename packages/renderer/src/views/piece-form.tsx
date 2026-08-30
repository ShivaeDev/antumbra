import type { PieceView } from "@antumbra/contract";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { charterPiece } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { emptyPiece, type PieceDraft, PieceFields } from "#views/piece-fields.tsx";

// why: chartering is how a voyage grows, but reading its pieces is what the
// pane is for — so the form is one press away rather than always in the way.
export const CharterPieceForm = ({
	onError,
	pieces,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly voyageId: string;
}) => {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<PieceDraft>(emptyPiece);
	const ready = draft.title !== "" && draft.charter !== "" && draft.role !== "";
	const submit = () =>
		charterPiece(
			{ ...draft, voyageId },
			() => {
				setDraft(emptyPiece);
				setOpen(false);
			},
			onError,
		);
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
				<PieceFields draft={draft} onChange={setDraft} pieces={pieces} />
				<DialogFooter>
					<Button disabled={!ready} onClick={submit} type="button">
						Charter piece
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
