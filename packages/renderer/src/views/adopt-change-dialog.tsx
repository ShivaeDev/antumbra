import type { QuayPiece } from "@antumbra/contract";
import { useState } from "react";
import { Button } from "#components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
} from "#components/ui/dialog.tsx";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog-sections.tsx";
import { AdoptChangeForm } from "#views/adopt-change-form.tsx";

// why: adopting is the rare act — most changes reach the quay because a piece
// opened them. The form is three fields and a picker, and left standing it
// outweighs the changes it sits under, so it waits behind its own button.
export const AdoptChangeDialog = ({
	pieces,
}: {
	readonly pieces: ReadonlyArray<QuayPiece>;
}) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Adopt a change
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Adopt a change opened by hand</DialogTitle>
					<DialogDescription>
						Point a change you opened yourself at the piece it belongs to, and
						the quay watches it from then on.
					</DialogDescription>
				</DialogHeader>
				<AdoptChangeForm onAdopted={() => setOpen(false)} pieces={pieces} />
			</DialogContent>
		</Dialog>
	);
};
