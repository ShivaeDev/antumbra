import { type AgentSettingsChoice, type RoleSettings, VOYAGE_AGENT_ROLES, type VoyageAgentRole, type VoyageView } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Effect, Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { setAgentSettings } from "#adapters/trpc-voyages.ts";
import { RequestForm } from "#forms/view.tsx";
import { useBackendModels } from "#hooks/backend-models.ts";
import {
	changedRoles,
	chosenOf,
	draftOf,
	roleDefault,
	roleDraftSchema,
	roleLabel,
	signatureOf,
	voyagePlaceholder,
	voyageRoleSettings,
} from "#views/role-settings.ts";
import { RoleFields, RoleGrid } from "#views/role-settings-fields.tsx";

const voyageSettingsSchema = Schema.Struct({ captain: roleDraftSchema, crew: roleDraftSchema });

const SettingsForm = ({
	backends,
	defaults,
	settingsOf,
	voyageId,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly settingsOf: (role: VoyageAgentRole) => AgentSettingsChoice;
	readonly voyageId: string;
}) => {
	const form = useRequestForm({
		defaultValues: { captain: draftOf(settingsOf("captain")), crew: draftOf(settingsOf("crew")) },
		schema: voyageSettingsSchema.check(
			Schema.makeFilter((value) =>
				changedRoles(VOYAGE_AGENT_ROLES, value, settingsOf).length === 0 ? "Name a backend, model or effort first" : undefined,
			),
		),
		request: (value) =>
			Effect.forEach(changedRoles(VOYAGE_AGENT_ROLES, value, settingsOf), (role) => setAgentSettings({ ...chosenOf(value[role]), role, voyageId })),
		resetAfterSuccess: (value) => value,
		onSuccess: () => undefined,
	});
	const drafts = useStore(form.store, (state) => state.values);
	const captainPlaceholder = voyagePlaceholder(backends, roleDefault(defaults, "captain"), drafts.captain.backend);
	const crewPlaceholder = voyagePlaceholder(backends, roleDefault(defaults, "crew"), drafts.crew.backend);
	const captainCatalog = useBackendModels(drafts.captain.backend === "" ? captainPlaceholder.backend : drafts.captain.backend);
	const crewCatalog = useBackendModels(drafts.crew.backend === "" ? crewPlaceholder.backend : drafts.crew.backend);
	return (
		<RequestForm form={form}>
			<RoleGrid backends={backends}>
				<RoleFields
					backends={backends}
					catalog={captainCatalog}
					fields="captain"
					form={form}
					inheritLabel="Fleet default"
					label={roleLabel.captain}
					placeholder={captainPlaceholder}
				/>
				<RoleFields
					backends={backends}
					catalog={crewCatalog}
					fields="crew"
					form={form}
					inheritLabel="Fleet default"
					label={roleLabel.crew}
					placeholder={crewPlaceholder}
				/>
			</RoleGrid>
			<div className="flex justify-end">
				<form.Submit disabled={changedRoles(VOYAGE_AGENT_ROLES, drafts, settingsOf).length === 0} pending="Saving…" size="sm" variant="outline">
					Save
				</form.Submit>
			</div>
		</RequestForm>
	);
};

export const VoyageRoleSettings = ({
	backends,
	defaults,
	voyage,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly voyage: VoyageView;
}) => {
	const settingsOf = voyageRoleSettings(voyage);
	return (
		<SettingsForm
			backends={backends}
			defaults={defaults}
			key={signatureOf(VOYAGE_AGENT_ROLES, settingsOf)}
			settingsOf={settingsOf}
			voyageId={voyage.id}
		/>
	);
};
