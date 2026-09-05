import type { OpenVoyageRequest } from "@antumbra/contract";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import type { ModelCatalog } from "#hooks/backend-models.ts";
import { AgentSettingsChoice } from "#views/agent-settings-choice.tsx";
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

export const withPresetModels = (draft: VoyageDraft, model: string): VoyageDraft =>
	model === "" || draft.captainModel !== "" || draft.crewModel !== "" ? draft : { ...draft, captainModel: model, crewModel: model };

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
	catalog,
	draft,
	onChange,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly catalog: ModelCatalog;
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
		<AgentSettingsChoice
			catalog={catalog}
			effort={draft.captainEffort}
			label="Captain"
			model={draft.captainModel}
			onChange={(chosen) => onChange({ ...draft, captainEffort: chosen.effort, captainModel: chosen.model })}
		/>
		<AgentSettingsChoice
			catalog={catalog}
			effort={draft.crewEffort}
			label="Crew"
			model={draft.crewModel}
			onChange={(chosen) => onChange({ ...draft, crewEffort: chosen.effort, crewModel: chosen.model })}
		/>
	</div>
);
