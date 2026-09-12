import { RoleDefaults } from "@antumbra/glass-role-settings/defaults.tsx";
import { Settings } from "@antumbra/glass-settings/settings.tsx";
import type { RendererProps } from "#props.ts";
import { RestartControl } from "#settings/restart-control.tsx";

export const SettingsPanel = (props: RendererProps & { readonly onError: (message: string) => void }) => (
	<section className="flex max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-8">
		<header>
			<h2 className="text-lg font-medium">Settings</h2>
			<p className="mt-1 text-xs text-muted-foreground">
				Changes take effect on the next pass of the work they govern. Running sessions are not interrupted.
			</p>
		</header>
		<RoleDefaults api={props.api} />
		<Settings api={props.api} />
		<RestartControl shell={props.shell} onError={props.onError} />
	</section>
);
