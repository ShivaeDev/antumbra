import type { QuayPiece } from "@antumbra/contract";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { useState } from "react";
import { AdoptChangeForm } from "#views/adopt-change-form.tsx";

export const AdoptChangeDialog = ({ pieces }: { readonly pieces: ReadonlyArray<QuayPiece> }) => {
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
					<DialogDescription>Point a change you opened yourself at the piece it belongs to, and the quay watches it from then on.</DialogDescription>
				</DialogHeader>
				<AdoptChangeForm onAdopted={() => setOpen(false)} pieces={pieces} />
			</DialogContent>
		</Dialog>
	);
};
