import { Input } from "#components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { FormField, textAreaClass } from "#views/form-field.tsx";

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

// why: the fleet decides which backends exist, so a draft that names one no
// longer offered falls back to the first rather than opening a voyage against
// a backend nothing can run.
export const chosenBackend = (
	backends: ReadonlyArray<string>,
	backend: string,
): string => (backends.includes(backend) ? backend : (backends[0] ?? ""));

const BackendOptions = ({
	backends,
}: {
	readonly backends: ReadonlyArray<string>;
}) => (
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
	<FormField label="Backend">
		{(id) => (
			<Select
				onValueChange={(backend) => onChange({ ...draft, backend })}
				value={chosenBackend(backends, draft.backend)}
			>
				<SelectTrigger id={id}>
					<SelectValue placeholder="Pick a backend" />
				</SelectTrigger>
				<SelectContent>
					<BackendOptions backends={backends} />
				</SelectContent>
			</Select>
		)}
	</FormField>
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
		<FormField label="Name">
			{(id) => (
				<Input
					id={id}
					onChange={(event) => onChange({ ...draft, name: event.target.value })}
					value={draft.name}
				/>
			)}
		</FormField>
		<FormField label="North star">
			{(id) => (
				<Input
					id={id}
					onChange={(event) =>
						onChange({ ...draft, northStar: event.target.value })
					}
					value={draft.northStar}
				/>
			)}
		</FormField>
		<FormField label="Context">
			{(id) => (
				<textarea
					className={textAreaClass}
					id={id}
					onChange={(event) =>
						onChange({ ...draft, context: event.target.value })
					}
					rows={3}
					value={draft.context}
				/>
			)}
		</FormField>
		<BackendField backends={backends} draft={draft} onChange={onChange} />
	</div>
);
