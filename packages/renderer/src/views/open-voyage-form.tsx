import { useStore } from "@tanstack/react-form";
import { Schema } from "effect";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useRequestForm } from "#adapters/form.ts";
import { openVoyage } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { RequestForm } from "#forms/view.tsx";
import { defaultModelId, useBackendModels } from "#hooks/backend-models.ts";
import { emptyDraft, openVoyageRequest, voyageDraftSchema, withChosenBackends, withPresetModel } from "#views/open-voyage-draft.ts";
import { VoyageFields } from "#views/open-voyage-fields.tsx";

export const OpenVoyageForm = ({
	backends,
	onOpened,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly onOpened: (voyageId: string) => void;
}) => {
	const [open, setOpen] = useState(false);
	const form = useRequestForm({
		defaultValues: emptyDraft,
		schema: voyageDraftSchema.check(Schema.makeFilter(() => (backends.length === 0 ? "No backend is registered" : undefined))),
		request: (value) => openVoyage(openVoyageRequest(withChosenBackends(backends, value))),
		resetAfterSuccess: () => emptyDraft,
		onSuccess: (opened) => {
			setOpen(false);
			onOpened(opened.id);
		},
	});
	const draft = useStore(form.store, (state) => state.values);
	const chosen = withChosenBackends(backends, draft);
	const captainCatalog = useBackendModels(chosen.captain.backend);
	const crewCatalog = useBackendModels(chosen.crew.backend);
	const captainPreset = defaultModelId(captainCatalog);
	const crewPreset = defaultModelId(crewCatalog);
	useEffect(() => {
		form.setFieldValue("captain", (current) => withPresetModel(current, captainPreset), { dontUpdateMeta: true });
	}, [captainPreset, form]);
	useEffect(() => {
		form.setFieldValue("crew", (current) => withPresetModel(current, crewPreset), { dontUpdateMeta: true });
	}, [crewPreset, form]);
	const ready = chosen.name !== "" && chosen.northStar !== "" && chosen.captain.backend !== "" && chosen.crew.backend !== "";
	useEffect(() => {
		void form.validate("change");
	}, [chosen.captain.backend, chosen.crew.backend, form]);
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
				<RequestForm form={form}>
					<VoyageFields
						form={form}
						fields={{ captain: "captain", crew: "crew", context: "context", name: "name", northStar: "northStar" }}
						backends={backends}
						captainBackend={chosen.captain.backend}
						crewBackend={chosen.crew.backend}
						captainCatalog={captainCatalog}
						crewCatalog={crewCatalog}
					/>
					<DialogFooter>
						<form.Submit disabled={!ready} pending="Opening…">
							Open voyage
						</form.Submit>
					</DialogFooter>
				</RequestForm>
			</DialogContent>
		</Dialog>
	);
};
