import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { spawnAgent } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { Field } from "#views/field.tsx";

const BackendField = ({
	backends,
	chosen,
	onBackend,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly chosen: string;
	readonly onBackend: (backend: string) => void;
}) => (
	<Field label="Backend">
		<Select onValueChange={onBackend} value={chosen}>
			<SelectTrigger aria-label="Backend">
				<SelectValue placeholder="no backend registered" />
			</SelectTrigger>
			<SelectContent>
				{backends.map((tag) => (
					<SelectItem key={tag} value={tag}>
						{tag}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	</Field>
);

export const SpawnDialog = ({ backends, onError }: { readonly backends: ReadonlyArray<string>; readonly onError: (message: string) => void }) => {
	const [open, setOpen] = useState(false);
	const [backend, setBackend] = useState("");
	const [role, setRole] = useState("");
	const [charter, setCharter] = useState("");
	const chosen = backends.includes(backend) ? backend : (backends[0] ?? "");
	const ready = role !== "" && charter !== "" && chosen !== "";
	const submit = () =>
		spawnAgent(
			{ backend: chosen, charter, role },
			() => {
				setRole("");
				setCharter("");
				setOpen(false);
			},
			onError,
		);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button>
					<PlusIcon />
					Spawn agent
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Spawn an agent</DialogTitle>
					<DialogDescription>A role to answer for and a charter to work from, on one of the backends this host registered.</DialogDescription>
				</DialogHeader>
				<BackendField backends={backends} chosen={chosen} onBackend={setBackend} />
				<Field label="Role">
					<Input aria-label="Role" onChange={(event) => setRole(event.target.value)} placeholder="navigator" value={role} />
				</Field>
				<Field label="Charter">
					<Textarea
						aria-label="Charter"
						onChange={(event) => setCharter(event.target.value)}
						placeholder="what this agent is for"
						rows={4}
						value={charter}
					/>
				</Field>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button disabled={!ready} onClick={submit}>
						Spawn
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
