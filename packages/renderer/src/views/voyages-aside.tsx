import type { VoyageSummary } from "@antumbra/contract";
import { SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { OpenVoyage } from "@antumbra/glass-voyages/open-voyage.tsx";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useGlass } from "#adapters/glass.ts";
import { VoyagesPanel } from "#views/voyages.tsx";

const Opening = ({ onOpened }: { readonly onOpened: () => void }) => <OpenVoyage api={useGlass()} onOpened={onOpened} />;

const OpenVoyageDialog = () => {
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
				<Opening onOpened={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
};

export const VoyagesAside = ({
	onError,
	onSelect,
	selected,
	voyages,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}) => (
	<div className="flex min-w-0 flex-col gap-3 font-sans">
		<SectionHeading count={voyages.length} title="Voyages" />
		<OpenVoyageDialog />
		<VoyagesPanel onError={onError} onSelect={onSelect} selected={selected} voyages={voyages} />
	</div>
);
