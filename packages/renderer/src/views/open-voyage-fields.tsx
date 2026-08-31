import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { Field, LabelledField } from "#views/field.tsx";

export interface VoyageDraft {
	readonly backend: string;
	readonly context: string;
	readonly name: string;
	readonly northStar: string;
}

export const emptyDraft: VoyageDraft = {
	backend: "",
	context: "",
	name: "",
	northStar: "",
};

export const chosenBackend = (backends: ReadonlyArray<string>, backend: string): string =>
	backends.includes(backend) ? backend : (backends[0] ?? "");

const BackendOptions = ({ backends }: { readonly backends: ReadonlyArray<string> }) => (
	<>
		{backends.map((tag) => (
			<SelectItem key={tag} value={tag}>
				{tag}
			</SelectItem>
		))}
	</>
);

const BackendField = ({
	backends,
	draft,
	onChange,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly draft: VoyageDraft;
	readonly onChange: (draft: VoyageDraft) => void;
}) => (
	<Field label="Backend">
		<Select onValueChange={(backend) => onChange({ ...draft, backend })} value={chosenBackend(backends, draft.backend)}>
			<SelectTrigger aria-label="Backend">
				<SelectValue placeholder="no backend registered" />
			</SelectTrigger>
			<SelectContent>
				<BackendOptions backends={backends} />
			</SelectContent>
		</Select>
	</Field>
);

export const VoyageFields = ({
	backends,
	draft,
	onChange,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly draft: VoyageDraft;
	readonly onChange: (draft: VoyageDraft) => void;
}) => (
	<div className="flex min-w-0 flex-col gap-3">
		<LabelledField label="Name">
			{(id) => <Input id={id} onChange={(event) => onChange({ ...draft, name: event.target.value })} value={draft.name} />}
		</LabelledField>
		<LabelledField label="North star">
			{(id) => <Input id={id} onChange={(event) => onChange({ ...draft, northStar: event.target.value })} value={draft.northStar} />}
		</LabelledField>
		<LabelledField label="Context">
			{(id) => <Textarea id={id} onChange={(event) => onChange({ ...draft, context: event.target.value })} rows={3} value={draft.context} />}
		</LabelledField>
		<BackendField backends={backends} draft={draft} onChange={onChange} />
	</div>
);
