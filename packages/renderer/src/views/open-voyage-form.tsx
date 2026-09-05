import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { openVoyage } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { defaultModelId, useBackendModels } from "#hooks/backend-models.ts";
import { emptyDraft, openVoyageRequest, type VoyageDraft, withChosenBackends, withPresetModel } from "#views/open-voyage-draft.ts";
import { VoyageFields } from "#views/open-voyage-fields.tsx";

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
	const chosen = withChosenBackends(backends, draft);
	const captainCatalog = useBackendModels(chosen.captain.backend);
	const crewCatalog = useBackendModels(chosen.crew.backend);
	const captainPreset = defaultModelId(captainCatalog);
	const crewPreset = defaultModelId(crewCatalog);
	useEffect(() => {
		setDraft((current) => ({ ...current, captain: withPresetModel(current.captain, captainPreset) }));
	}, [captainPreset]);
	useEffect(() => {
		setDraft((current) => ({ ...current, crew: withPresetModel(current.crew, crewPreset) }));
	}, [crewPreset]);
	const ready = chosen.name !== "" && chosen.northStar !== "" && chosen.captain.backend !== "" && chosen.crew.backend !== "";
	const submit = () =>
		openVoyage(
			openVoyageRequest(chosen),
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
					<DialogDescription>
						A voyage needs a name, the north star it steers by, and who sails it. The work itself is chartered later.
					</DialogDescription>
				</DialogHeader>
				<VoyageFields backends={backends} captainCatalog={captainCatalog} crewCatalog={crewCatalog} draft={chosen} onChange={setDraft} />
				<DialogFooter>
					<Button disabled={!ready} onClick={submit} type="button">
						Open voyage
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
