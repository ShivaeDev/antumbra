import { PageHeader } from "@antumbra/glass-components/compositions/page-header.tsx";
import { RoleDefaults } from "@antumbra/glass-role-settings/defaults.tsx";
import { Settings } from "@antumbra/glass-settings/settings.tsx";
import type { RendererProps } from "#props.ts";
import { RebuildControl } from "#settings/rebuild-control.tsx";
import { RestartControl } from "#settings/restart-control.tsx";

const DESCRIPTION = "Changes take effect on the next pass of the work they govern; running sessions are not interrupted.";

export const SettingsPanel = (props: RendererProps & { readonly onError: (message: string) => void }) => (
	<section className="flex min-h-0 min-w-0 flex-1 flex-col px-6 pt-5">
		<PageHeader description={DESCRIPTION} title="Settings" />
		<div className="min-h-0 flex-1 space-y-8 overflow-y-auto pb-10">
			<RoleDefaults api={props.api} />
			<Settings api={props.api} />
			<RebuildControl rebuild={props.rebuildProjections} onError={props.onError} />
			<RestartControl onError={props.onError} shell={props.shell} />
		</div>
	</section>
);
