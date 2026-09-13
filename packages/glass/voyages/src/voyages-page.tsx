import { PageHeader } from "@antumbra/glass-components/compositions/page-header.tsx";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@antumbra/glass-components/shadcn/dialog.tsx";
import { ScrollArea } from "@antumbra/glass-components/shadcn/scroll-area.tsx";
import { useState } from "react";
import type { VoyagesApi } from "#glass.ts";
import { OpenVoyage } from "#open-voyage.tsx";
import { VoyageList } from "#voyage-list.tsx";

const OPENING = "A voyage needs a name, the north star it steers by, and who sails it. The work itself is chartered later.";

const OpenVoyageDialog = ({ api }: { readonly api: VoyagesApi }) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm">Open voyage</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Open a voyage</DialogTitle>
					<DialogDescription>{OPENING}</DialogDescription>
				</DialogHeader>
				<OpenVoyage api={api} onOpened={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
};

export const VoyagesPage = (props: { readonly api: VoyagesApi; readonly onSelect: (voyageId: string) => void }) => (
	<section className="flex min-h-0 min-w-0 flex-1 flex-col">
		<div className="max-w-[1040px] shrink-0 px-6 pt-5">
			<PageHeader actions={<OpenVoyageDialog api={props.api} />} title="Voyages" />
		</div>
		<ScrollArea className="min-h-0 flex-1">
			<div className="max-w-[1040px] px-6 pb-10">
				<VoyageList api={props.api} onSelect={props.onSelect} />
			</div>
		</ScrollArea>
	</section>
);
