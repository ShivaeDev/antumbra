import { useStore } from "@tanstack/react-form";
import { Schema } from "effect";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useRequestForm } from "#adapters/form.ts";
import { spawnAgent } from "#adapters/trpc.ts";
import { Button, buttonVariants } from "#components/ui/button.tsx";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { RequestForm } from "#forms/view.tsx";

const blank = { backend: "", role: "", charter: "" };
const chosenBackend = (backends: ReadonlyArray<string>, backend: string) => (backends.includes(backend) ? backend : (backends[0] ?? ""));
const draftSchema = Schema.Struct({ backend: Schema.String, role: Schema.NonEmptyString, charter: Schema.NonEmptyString });

export const SpawnDialog = ({ backends }: { readonly backends: ReadonlyArray<string> }) => {
	const [open, setOpen] = useState(false);
	const form = useRequestForm({
		defaultValues: blank,
		schema: draftSchema.check(
			Schema.makeFilter((draft) =>
				chosenBackend(backends, draft.backend) === "" ? { path: ["backend"], issue: "No backend is registered" } : undefined,
			),
		),
		request: (draft) => spawnAgent({ ...draft, backend: chosenBackend(backends, draft.backend) }),
		resetAfterSuccess: (draft) => ({ ...draft, role: "", charter: "" }),
		onSuccess: () => setOpen(false),
	});
	const draft = useStore(form.store, (state) => state.values);
	const chosen = chosenBackend(backends, draft.backend);
	useEffect(() => {
		void form.validate("change");
	}, [chosen, form]);
	const ready = draft.role !== "" && draft.charter !== "" && chosen !== "";
	const choices = backends.map((backend) => ({ value: backend, label: backend }));
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button type="button">
					<PlusIcon />
					Spawn agent
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Spawn an agent</DialogTitle>
					<DialogDescription>A role to answer for and a charter to work from, on one of the backends this host registered.</DialogDescription>
				</DialogHeader>
				<RequestForm form={form}>
					<form.AppField name="backend">
						{(field) => <field.SelectField label="Backend" value={chosen} choices={choices} placeholder="no backend registered" />}
					</form.AppField>
					<form.AppField name="role">{(field) => <field.TextField label="Role" placeholder="navigator" />}</form.AppField>
					<form.AppField name="charter">
						{(field) => <field.TextareaField label="Charter" placeholder="what this agent is for" rows={4} />}
					</form.AppField>
					<DialogFooter>
						<DialogClose type="button" className={buttonVariants({ variant: "outline" })}>
							Cancel
						</DialogClose>
						<form.Submit disabled={!ready} pending="Spawning…">
							Spawn
						</form.Submit>
					</DialogFooter>
				</RequestForm>
			</DialogContent>
		</Dialog>
	);
};
