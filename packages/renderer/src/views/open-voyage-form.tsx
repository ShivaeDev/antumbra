import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { openVoyage } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { chosenBackend, emptyDraft, type VoyageDraft, VoyageFields } from "#views/open-voyage-fields.tsx";

export const OpenVoyageForm = ({
	backends,
	onError,
	onOpened,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly onError: (message: string) => void;
	readonly onOpened: (voyageId: string) => void;
}) => {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<VoyageDraft>(emptyDraft);
	const backend = chosenBackend(backends, draft.backend);
	const ready = draft.name !== "" && draft.northStar !== "" && backend !== "";
	const submit = () =>
		openVoyage(
			{ ...draft, backend },
			(opened) => {
				setDraft(emptyDraft);
				setOpen(false);
				onOpened(opened.id);
			},
			onError,
		);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button className="w-full" type="button">
					<PlusIcon />
					Open voyage
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Open a voyage</DialogTitle>
					<DialogDescription>A voyage needs a name and the north star it steers by. Everything else is chartered later.</DialogDescription>
				</DialogHeader>
				<VoyageFields backends={backends} draft={draft} onChange={setDraft} />
				<DialogFooter>
					<Button disabled={!ready} onClick={submit} type="button">
						Open voyage
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
