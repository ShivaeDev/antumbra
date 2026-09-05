import { AGENT_ROLES, type AgentRole, type RoleSettings } from "@antumbra/contract";
import { setRoleSettings } from "#adapters/trpc.ts";
import { fleetPlaceholder, roleDefault, roleLabel } from "#views/role-settings.ts";
import { RoleSettingsForm } from "#views/role-settings-form.tsx";

export const RoleDefaults = ({
	backends,
	defaults,
	onError,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly onError: (message: string) => void;
}) => {
	const placeholder = fleetPlaceholder(backends);
	const lines = AGENT_ROLES.map((role: AgentRole) => ({
		label: roleLabel[role],
		placeholder,
		role,
		settings: roleDefault(defaults, role),
	}));
	return (
		<section className="flex flex-col gap-3 rounded-md border border-border p-4">
			<h3 className="text-sm font-medium">Fleet defaults</h3>
			<p className="text-xs text-muted-foreground">The flagship, captains and crew run on these unless a voyage sets its own.</p>
			<RoleSettingsForm
				backends={backends}
				inheritLabel={null}
				lines={lines}
				onSave={(changes) => {
					for (const change of changes) {
						setRoleSettings({ ...change.settings, role: change.role }, onError);
					}
				}}
				saveLabel="Save"
			/>
		</section>
	);
};
