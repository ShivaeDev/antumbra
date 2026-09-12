import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { useState } from "react";
import type { ChangesApi } from "#glass.ts";
export const AdoptChangeDialog = ({ api }: { readonly api: ChangesApi }) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Adopt a pull request
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Adopt a pull request</DialogTitle>
					<DialogDescription>Link an existing pull request to the piece that owes it.</DialogDescription>
				</DialogHeader>
				<AdoptionForm api={api} close={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
};

const AdoptionForm = ({ api, close }: { readonly api: ChangesApi; readonly close: () => void }) => (
	<Live query={api.pieces.all} input={{}}>
		{(pieces) =>
			pieces.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					No piece is chartered yet — a change is adopted onto the piece that owes it, so charter one first
				</p>
			) : (
				<CommandForm command={api.changes.requestAdoption} label="Adopt change" submit="Adopt" sent={close} titles />
			)
		}
	</Live>
);
