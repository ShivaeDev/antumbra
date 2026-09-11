import { RoleDefaults } from "@antumbra/glass-role-settings/defaults.tsx";
import { Settings } from "@antumbra/glass-settings/settings.tsx";
import { glass } from "#adapters/glass.ts";
import { RestartControl } from "#views/restart-control.tsx";

export const SettingsPanel = ({ onError }: { readonly onError: (message: string) => void }) => (
	<section className="flex max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-8">
		<header>
			<h2 className="text-lg font-medium">Settings</h2>
			<p className="mt-1 text-xs text-muted-foreground">
				Changes take effect on the next pass of the work they govern. Running sessions are not interrupted.
			</p>
		</header>
		<RoleDefaults api={glass.api} />
		<Settings api={glass.api} />
		<RestartControl onError={onError} />
	</section>
);
