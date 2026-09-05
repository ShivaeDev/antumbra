import type { PieceView } from "@antumbra/contract";
import { Schema, SchemaGetter } from "effect";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useRequestForm } from "#adapters/form.ts";
import { charterPiece } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { RequestForm } from "#forms/view.tsx";
import { emptyPiece, PieceFields, pieceDraftSchema } from "#views/piece-fields.tsx";

const charterDraftSchema = Schema.Struct({ piece: pieceDraftSchema }).pipe(
	Schema.decodeTo(pieceDraftSchema, {
		decode: SchemaGetter.transform(({ piece }) => piece),
		encode: SchemaGetter.transform((piece) => ({ piece })),
	}),
);

export const CharterPieceForm = ({ pieces, voyageId }: { readonly pieces: ReadonlyArray<PieceView>; readonly voyageId: string }) => {
	const [open, setOpen] = useState(false);
	const form = useRequestForm({
		defaultValues: { piece: emptyPiece },
		schema: charterDraftSchema,
		request: (piece) => charterPiece({ ...piece, voyageId }),
		resetAfterSuccess: () => ({ piece: emptyPiece }),
		onSuccess: () => setOpen(false),
	});
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
				<RequestForm form={form}>
					<PieceFields fields="piece" form={form} pieces={pieces} />
					<DialogFooter>
						<form.Submit pending="Chartering…">Charter piece</form.Submit>
					</DialogFooter>
				</RequestForm>
			</DialogContent>
		</Dialog>
	);
};
