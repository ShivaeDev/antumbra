import { type RoleSettings, VOYAGE_AGENT_ROLES, type VoyageAgentRole, type VoyageView } from "@antumbra/contract";
import { setAgentSettings } from "#adapters/trpc-voyages.ts";
import { roleDefault, roleLabel, voyagePlaceholder } from "#views/role-settings.ts";
import { RoleSettingsForm } from "#views/role-settings-form.tsx";

export const VoyageRoleSettings = ({
	backends,
	defaults,
	onError,
	voyage,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly onError: (message: string) => void;
	readonly voyage: VoyageView;
}) => {
	const lines = VOYAGE_AGENT_ROLES.map((role: VoyageAgentRole) => ({
		label: roleLabel[role],
		placeholder: voyagePlaceholder(backends, roleDefault(defaults, role)),
		role,
		settings: role === "captain" ? voyage.captainSettings : voyage.crewSettings,
	}));
	return (
		<RoleSettingsForm
			backends={backends}
			inheritLabel="Fleet default"
			lines={lines}
			onSave={(changes) => {
				for (const change of changes) {
					setAgentSettings({ ...change.settings, role: change.role, voyageId: voyage.id }, onError);
				}
			}}
			saveLabel="Save"
		/>
	);
};
