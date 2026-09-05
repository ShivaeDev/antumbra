import type { OpenVoyageRequest } from "@antumbra/contract";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { Field, LabelledField } from "#views/field.tsx";

export interface VoyageDraft {
	readonly backend: string;
	readonly captainEffort: string;
	readonly captainModel: string;
	readonly context: string;
	readonly crewEffort: string;
	readonly crewModel: string;
	readonly name: string;
	readonly northStar: string;
}

export const emptyDraft: VoyageDraft = {
	backend: "",
	captainEffort: "",
	captainModel: "",
	context: "",
	crewEffort: "",
	crewModel: "",
	name: "",
	northStar: "",
};

export const openVoyageRequest = (draft: VoyageDraft, backend: string): OpenVoyageRequest => ({
	backend,
	...(draft.captainEffort === "" ? {} : { captainEffort: draft.captainEffort }),
	...(draft.captainModel === "" ? {} : { captainModel: draft.captainModel }),
	context: draft.context,
	...(draft.crewEffort === "" ? {} : { crewEffort: draft.crewEffort }),
	...(draft.crewModel === "" ? {} : { crewModel: draft.crewModel }),
	name: draft.name,
	northStar: draft.northStar,
});

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

const AgentSettingsFields = ({
	draft,
	effortKey,
	label,
	modelKey,
	onChange,
}: {
	readonly draft: VoyageDraft;
	readonly effortKey: "captainEffort" | "crewEffort";
	readonly label: string;
	readonly modelKey: "captainModel" | "crewModel";
	readonly onChange: (draft: VoyageDraft) => void;
}) => (
	<div className="flex min-w-0 flex-wrap gap-2">
		<div className="min-w-40 flex-1">
			<LabelledField label={`${label} model`}>
				{(id) => (
					<Input
						id={id}
						onChange={(event) => onChange({ ...draft, [modelKey]: event.target.value })}
						placeholder="the backend's own"
						value={draft[modelKey]}
					/>
				)}
			</LabelledField>
		</div>
		<div className="min-w-24">
			<LabelledField label={`${label} effort`}>
				{(id) => (
					<Input
						id={id}
						onChange={(event) => onChange({ ...draft, [effortKey]: event.target.value })}
						placeholder="the backend's own"
						value={draft[effortKey]}
					/>
				)}
			</LabelledField>
		</div>
	</div>
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
		<AgentSettingsFields draft={draft} effortKey="captainEffort" label="Captain" modelKey="captainModel" onChange={onChange} />
		<AgentSettingsFields draft={draft} effortKey="crewEffort" label="Crew" modelKey="crewModel" onChange={onChange} />
	</div>
);
