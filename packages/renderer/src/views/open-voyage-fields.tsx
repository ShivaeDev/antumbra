import { withFieldGroup } from "#forms/hook.ts";
import { emptyCatalog, type ModelCatalog } from "#hooks/backend-models.ts";
import { AgentSettingsChoice } from "#views/agent-settings-choice.tsx";
import { emptyDraft } from "#views/open-voyage-draft.ts";

const roleProps: { readonly backends: ReadonlyArray<string>; readonly backend: string; readonly catalog: ModelCatalog; readonly label: string } = {
	backends: [],
	backend: "",
	catalog: emptyCatalog,
	label: "",
};
const RoleRow = withFieldGroup({
	defaultValues: emptyDraft.captain,
	props: roleProps,
	render: ({ group, backends, backend, catalog, label }) => {
		const choices = backends.map((tag) => ({ value: tag, label: tag }));
		return (
			<>
				<span className="text-xs">{label}</span>
				<group.AppField
					name="backend"
					listeners={{
						onChange: () => {
							group.setFieldValue("model", "");
							group.setFieldValue("effort", "");
						},
					}}
				>
					{(field) => (
						<field.SelectField
							label={<span className="sr-only">{`${label} backend`}</span>}
							aria-label={`${label} backend`}
							value={backend}
							choices={choices}
							placeholder=""
							disabled={backends.length === 0}
						/>
					)}
				</group.AppField>
				<AgentSettingsChoice
					form={group}
					fields={{ model: "model", effort: "effort" }}
					catalog={catalog}
					label={label}
					labelClassName="sr-only"
					placeholder="default"
				/>
			</>
		);
	},
});

const voyageProps: {
	readonly backends: ReadonlyArray<string>;
	readonly captainBackend: string;
	readonly crewBackend: string;
	readonly captainCatalog: ModelCatalog;
	readonly crewCatalog: ModelCatalog;
} = {
	backends: [],
	captainBackend: "",
	crewBackend: "",
	captainCatalog: emptyCatalog,
	crewCatalog: emptyCatalog,
};

export const VoyageFields = withFieldGroup({
	defaultValues: emptyDraft,
	props: voyageProps,
	render: ({ group, backends, captainBackend, crewBackend, captainCatalog, crewCatalog }) => (
		<>
			<group.AppField name="name">{(field) => <field.TextField label="Name" />}</group.AppField>
			<group.AppField name="northStar">{(field) => <field.TextField label="North star" />}</group.AppField>
			<group.AppField name="context">{(field) => <field.TextareaField label="Context" />}</group.AppField>
			<div className="grid min-w-0 grid-cols-[auto_7rem_1fr_6rem] items-center gap-x-2 gap-y-1">
				<span />
				<span className="text-2xs text-muted-foreground">Backend</span>
				<span className="text-2xs text-muted-foreground">Model</span>
				<span className="text-2xs text-muted-foreground">Effort</span>
				<RoleRow form={group} fields="captain" backends={backends} backend={captainBackend} catalog={captainCatalog} label="Captain" />
				<RoleRow form={group} fields="crew" backends={backends} backend={crewBackend} catalog={crewCatalog} label="Crew" />
				{backends.length === 0 ? <p className="col-span-full text-2xs text-muted-foreground">No backend is registered.</p> : null}
			</div>
		</>
	),
});
