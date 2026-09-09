import { Live } from "@antumbra/glass-client/live.tsx";
import type { RoleSettingsApi } from "#glass.ts";
import { FLEET } from "#placeholders.ts";
import { RoleForms } from "#rows.tsx";

export const RoleDefaults = (props: { readonly api: RoleSettingsApi }) => (
	<section className="flex flex-col gap-3 rounded-md border border-border p-4">
		<h3 className="text-sm font-medium">Fleet defaults</h3>
		<p className="text-xs text-muted-foreground">Each role runs on these unless a voyage sets its own; the flagship and smoother are fleet-wide.</p>
		<Live input={{}} query={props.api.roleSettings.defaults} waiting="Reading the fleet's defaults…">
			{(rows) => <RoleForms choose={props.api.roleSettings.choose} placeholdersOf={() => FLEET} rows={rows} />}
		</Live>
	</section>
);
