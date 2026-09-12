import { Live } from "@antumbra/glass-client/live.tsx";
import { SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { OpenVoyage } from "@antumbra/glass-voyages/open-voyage.tsx";
import { VoyageList } from "@antumbra/glass-voyages/voyage-list.tsx";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import type { RendererApi } from "#api.ts";

const OpenVoyageDialog = ({ api }: { readonly api: RendererApi }) => {
	const [open, setOpen] = useState(false);
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
				<OpenVoyage api={api} onOpened={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
};

export const VoyagesAside = (props: {
	readonly api: RendererApi;
	readonly onHail: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly onSelect: (voyageId: string) => void;
}) => (
	<div className="flex min-w-0 flex-col gap-3 font-sans">
		<Live input={{}} query={props.api.voyages.list}>
			{(voyages) => <SectionHeading count={voyages.length} title="Voyages" />}
		</Live>
		<OpenVoyageDialog api={props.api} />
		<VoyageList {...props} />
	</div>
);
