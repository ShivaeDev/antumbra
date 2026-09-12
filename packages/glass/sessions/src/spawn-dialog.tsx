import { type Editable, editablesOf, valuesOf } from "@antumbra/glass-components/fields.ts";
import { sending } from "@antumbra/glass-components/generated.ts";
import { Row } from "@antumbra/glass-components/row.tsx";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogContent, DialogTrigger } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { useMemo, useState } from "react";
import type { SessionsApi } from "#glass.ts";

const PLACEHOLDERS = { role: "navigator" };

const NOTHING: Readonly<Record<string, string>> = {};

export const SpawnDialog = ({ api }: { readonly api: SessionsApi }) => {
	const [open, setOpen] = useState(false);
	const [revision, setRevision] = useState(0);
	const editables: readonly Editable[] = useMemo(() => editablesOf(api.agents.spawn.command, []), [api]);
	const blank = useMemo(() => valuesOf(editables, {}), [editables]);
	const send = useMemo(() => sending(api.agents.spawn), [api]);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>Spawn agent</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Spawn an agent</DialogTitle>
					<DialogDescription>A role to answer for, on one of the backends this host registered.</DialogDescription>
				</DialogHeader>
				<Row
					key={revision}
					captions={NOTHING}
					creating
					description={undefined}
					editables={editables}
					identity={{}}
					known={{}}
					label="Spawn agent"
					placeholders={PLACEHOLDERS}
					send={send}
					sent={() => {
						setOpen(false);
						setRevision((value) => value + 1);
					}}
					submit="Spawn"
					titles
					values={blank}
				/>
			</DialogContent>
		</Dialog>
	);
};
