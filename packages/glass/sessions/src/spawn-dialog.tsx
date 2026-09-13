import type { Resolution } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { DialogForm } from "@antumbra/glass-components/dialog-form.tsx";
import { editablesOf, valuesOf } from "@antumbra/glass-components/fields.ts";
import { sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@antumbra/glass-components/shadcn/dialog.tsx";
import { useMemo, useState } from "react";
import type { SessionsApi } from "#glass.ts";

const BACKEND_DEFAULT = "backend default";

const NOTHING = {};

const placeholdersOf = (resolved: Resolution): Readonly<Record<string, string>> => ({
	effort: resolved.effort.value ?? BACKEND_DEFAULT,
	model: resolved.model.value ?? BACKEND_DEFAULT,
	role: "navigator",
});

const SpawnFields = (props: { readonly api: SessionsApi; readonly resolved: Resolution; readonly onSpawned: () => void }) => {
	const editables = useMemo(() => editablesOf(props.api.agents.spawn.command, []), [props.api]);
	const values = useMemo(() => ({ ...valuesOf(editables, {}), backend: props.resolved.backend.value }), [editables, props.resolved]);
	const send = useMemo(() => sending(props.api.agents.spawn), [props.api]);
	const form = useGenerated(editables, NOTHING, values, send, props.onSpawned);
	return <DialogForm cancel editables={editables} form={form} placeholders={placeholdersOf(props.resolved)} submit="Spawn" />;
};

export const SpawnDialog = ({ api }: { readonly api: SessionsApi }) => {
	const [open, setOpen] = useState(false);
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm">Spawn agent</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Spawn an agent</DialogTitle>
					<DialogDescription>A role to answer for, on one of the backends this host registered.</DialogDescription>
				</DialogHeader>
				<Live input={{ role: "crew", voyageId: null }} query={api.roleSettings.resolve} waiting="Reading the crew's defaults…">
					{(resolved) => <SpawnFields api={api} onSpawned={() => setOpen(false)} resolved={resolved} />}
				</Live>
			</DialogContent>
		</Dialog>
	);
};
