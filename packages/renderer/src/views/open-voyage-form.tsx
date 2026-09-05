import type { RoleSettings } from "@antumbra/contract";
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
import { useBackendModels } from "#hooks/backend-models.ts";
import { emptyDraft, openVoyageRequest, voyageDraftSchema } from "#views/open-voyage-draft.ts";
import { VoyageFields } from "#views/open-voyage-fields.tsx";
import { roleDefault, voyagePlaceholder } from "#views/role-settings.ts";

export const OpenVoyageForm = ({
	backends,
	defaults,
	onOpened,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly onOpened: (voyageId: string) => void;
}) => {
	const [open, setOpen] = useState(false);
	const form = useRequestForm({
		defaultValues: emptyDraft,
		schema: voyageDraftSchema.check(Schema.makeFilter(() => (backends.length === 0 ? "No backend is registered" : undefined))),
		request: (value) => openVoyage(openVoyageRequest(value)),
		resetAfterSuccess: () => emptyDraft,
		onSuccess: (opened) => {
			setOpen(false);
			onOpened(opened.id);
		},
	});
	const draft = useStore(form.store, (state) => state.values);
	const captainPlaceholder = voyagePlaceholder(backends, roleDefault(defaults, "captain"));
	const crewPlaceholder = voyagePlaceholder(backends, roleDefault(defaults, "crew"));
	const captainCatalog = useBackendModels(draft.captain.backend === "" ? captainPlaceholder.backend : draft.captain.backend);
	const crewCatalog = useBackendModels(draft.crew.backend === "" ? crewPlaceholder.backend : draft.crew.backend);
	const ready = draft.name !== "" && draft.northStar !== "";
	useEffect(() => {
		void form.validate("change");
	}, [backends.length, form]);
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
						backends={backends}
						captainCatalog={captainCatalog}
						captainPlaceholder={captainPlaceholder}
						crewCatalog={crewCatalog}
						crewPlaceholder={crewPlaceholder}
						fields={{ captain: "captain", context: "context", crew: "crew", name: "name", northStar: "northStar" }}
						form={form}
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
