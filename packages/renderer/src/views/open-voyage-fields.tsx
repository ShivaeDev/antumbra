import { useId } from "react";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { effortsFor, type ModelCatalog } from "#hooks/backend-models.ts";
import { LabelledField } from "#views/field.tsx";
import { type AgentDraft, type VoyageDraft, withBackend } from "#views/open-voyage-draft.ts";

const RoleRow = ({
	agent,
	backends,
	catalog,
	label,
	onChange,
}: {
	readonly agent: AgentDraft;
	readonly backends: ReadonlyArray<string>;
	readonly catalog: ModelCatalog;
	readonly label: string;
	readonly onChange: (agent: AgentDraft) => void;
}) => {
	const models = useId();
	const efforts = useId();
	return (
		<>
			<span className="text-xs">{label}</span>
			<Select disabled={backends.length === 0} onValueChange={(backend) => onChange(withBackend(backend))} value={agent.backend}>
				<SelectTrigger aria-label={`${label} backend`}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{backends.map((tag) => (
						<SelectItem key={tag} value={tag}>
							{tag}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="min-w-0">
				<Input
					aria-label={`${label} model`}
					list={models}
					onChange={(event) => onChange({ ...agent, model: event.target.value })}
					placeholder="default"
					value={agent.model}
				/>
				<datalist id={models}>
					{catalog.choices.map((choice) => (
						<option key={choice.id} value={choice.id}>
							{choice.name}
						</option>
					))}
				</datalist>
			</div>
			<div className="min-w-0">
				<Input
					aria-label={`${label} effort`}
					list={efforts}
					onChange={(event) => onChange({ ...agent, effort: event.target.value })}
					placeholder="default"
					value={agent.effort}
				/>
				<datalist id={efforts}>
					{effortsFor(catalog, agent.model).map((offered) => (
						<option key={offered} value={offered} />
					))}
				</datalist>
			</div>
			{catalog.failure === null ? null : (
				<p className="col-span-4 text-2xs text-destructive">{`${label} models could not be listed: ${catalog.failure}. Name one yourself.`}</p>
			)}
		</>
	);
};

const ColumnHeadings = () => (
	<>
		<span />
		<span className="text-2xs text-muted-foreground">Backend</span>
		<span className="text-2xs text-muted-foreground">Model</span>
		<span className="text-2xs text-muted-foreground">Effort</span>
	</>
);

export const VoyageFields = ({
	backends,
	captainCatalog,
	crewCatalog,
	draft,
	onChange,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly captainCatalog: ModelCatalog;
	readonly crewCatalog: ModelCatalog;
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
		<div className="grid min-w-0 grid-cols-[auto_7rem_1fr_6rem] items-center gap-x-2 gap-y-1">
			<ColumnHeadings />
			<RoleRow
				agent={draft.captain}
				backends={backends}
				catalog={captainCatalog}
				label="Captain"
				onChange={(captain) => onChange({ ...draft, captain })}
			/>
			<RoleRow agent={draft.crew} backends={backends} catalog={crewCatalog} label="Crew" onChange={(crew) => onChange({ ...draft, crew })} />
			{backends.length === 0 ? <p className="col-span-4 text-2xs text-muted-foreground">No backend is registered.</p> : null}
		</div>
	</div>
);
