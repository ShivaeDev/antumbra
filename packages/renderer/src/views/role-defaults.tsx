import { AGENT_ROLES, type AgentRole, type AgentSettingsChoice, type RoleSettings } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Effect, Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { setRoleSettings } from "#adapters/trpc.ts";
import { RequestForm } from "#forms/view.tsx";
import { useBackendModels } from "#hooks/backend-models.ts";
import { changedRoles, chosenOf, draftOf, fleetPlaceholder, roleDefault, roleDraftSchema, roleLabel, signatureOf } from "#views/role-settings.ts";
import { RoleFields, RoleGrid } from "#views/role-settings-fields.tsx";

const defaultsSchema = Schema.Struct({ captain: roleDraftSchema, crew: roleDraftSchema, flagship: roleDraftSchema, smoother: roleDraftSchema });

const DefaultsForm = ({
	backends,
	settingsOf,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly settingsOf: (role: AgentRole) => AgentSettingsChoice;
}) => {
	const form = useRequestForm({
		defaultValues: {
			captain: draftOf(settingsOf("captain")),
			crew: draftOf(settingsOf("crew")),
			flagship: draftOf(settingsOf("flagship")),
			smoother: draftOf(settingsOf("smoother")),
		},
		schema: defaultsSchema.check(
			Schema.makeFilter((value) => (changedRoles(AGENT_ROLES, value, settingsOf).length === 0 ? "Name a backend, model or effort first" : undefined)),
		),
		request: (value) => Effect.forEach(changedRoles(AGENT_ROLES, value, settingsOf), (role) => setRoleSettings({ ...chosenOf(value[role]), role })),
		resetAfterSuccess: (value) => value,
		onSuccess: () => undefined,
	});
	const drafts = useStore(form.store, (state) => state.values);
	const placeholder = fleetPlaceholder(backends);
	const catalogs = {
		captain: useBackendModels(drafts.captain.backend === "" ? placeholder.backend : drafts.captain.backend),
		crew: useBackendModels(drafts.crew.backend === "" ? placeholder.backend : drafts.crew.backend),
		flagship: useBackendModels(drafts.flagship.backend === "" ? placeholder.backend : drafts.flagship.backend),
		smoother: useBackendModels(drafts.smoother.backend === "" ? placeholder.backend : drafts.smoother.backend),
	};
	return (
		<RequestForm form={form}>
			<RoleGrid backends={backends}>
				{AGENT_ROLES.map((role) => (
					<RoleFields
						backends={backends}
						catalog={catalogs[role]}
						fields={role}
						form={form}
						inheritLabel={null}
						key={role}
						label={roleLabel[role]}
						placeholder={placeholder}
					/>
				))}
			</RoleGrid>
			<div className="flex justify-end">
				<form.Submit disabled={changedRoles(AGENT_ROLES, drafts, settingsOf).length === 0} pending="Saving…" size="sm" variant="outline">
					Save
				</form.Submit>
			</div>
		</RequestForm>
	);
};

export const RoleDefaults = ({
	backends,
	defaults,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
}) => {
	const settingsOf = (role: AgentRole) => roleDefault(defaults, role);
	return (
		<section className="flex flex-col gap-3 rounded-md border border-border p-4">
			<h3 className="text-sm font-medium">Fleet defaults</h3>
			<p className="text-xs text-muted-foreground">Each role runs on these unless a voyage sets its own; the flagship and smoother are fleet-wide.</p>
			<DefaultsForm backends={backends} key={signatureOf(AGENT_ROLES, settingsOf)} settingsOf={settingsOf} />
		</section>
	);
};
