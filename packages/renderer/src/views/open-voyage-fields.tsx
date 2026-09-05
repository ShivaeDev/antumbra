import { withFieldGroup } from "#forms/hook.ts";
import { emptyCatalog, type ModelCatalog } from "#hooks/backend-models.ts";
import { emptyDraft } from "#views/open-voyage-draft.ts";
import { EMPTY_PLACEHOLDER, type RolePlaceholder } from "#views/role-settings.ts";
import { RoleFields, RoleGrid } from "#views/role-settings-fields.tsx";

const voyageProps: {
	readonly backends: ReadonlyArray<string>;
	readonly captainCatalog: ModelCatalog;
	readonly captainPlaceholder: RolePlaceholder;
	readonly crewCatalog: ModelCatalog;
	readonly crewPlaceholder: RolePlaceholder;
} = {
	backends: [],
	captainCatalog: emptyCatalog,
	captainPlaceholder: EMPTY_PLACEHOLDER,
	crewCatalog: emptyCatalog,
	crewPlaceholder: EMPTY_PLACEHOLDER,
};

export const VoyageFields = withFieldGroup({
	defaultValues: emptyDraft,
	props: voyageProps,
	render: ({ group, backends, captainCatalog, captainPlaceholder, crewCatalog, crewPlaceholder }) => (
		<>
			<group.AppField name="name">{(field) => <field.TextField label="Name" />}</group.AppField>
			<group.AppField name="northStar">{(field) => <field.TextField label="North star" />}</group.AppField>
			<group.AppField name="context">{(field) => <field.TextareaField label="Context" />}</group.AppField>
			<RoleGrid backends={backends}>
				<RoleFields
					backends={backends}
					catalog={captainCatalog}
					fields="captain"
					form={group}
					inheritLabel="Fleet default"
					label="Captain"
					placeholder={captainPlaceholder}
				/>
				<RoleFields
					backends={backends}
					catalog={crewCatalog}
					fields="crew"
					form={group}
					inheritLabel="Fleet default"
					label="Crew"
					placeholder={crewPlaceholder}
				/>
			</RoleGrid>
		</>
	),
});
