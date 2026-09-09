import { Live } from "@antumbra/glass-client/live.tsx";
import type { Held } from "@antumbra/glass-components/fields.ts";
import type { RoleSettingsApi } from "#glass.ts";
import { type Inherited, voyagePlaceholders } from "#placeholders.ts";
import { RoleForms } from "#rows.tsx";

const inheriting = (fleet: readonly Inherited[]) => (row: Held) => voyagePlaceholders(fleet, String(row.role));

export const VoyageRoleSettings = (props: { readonly api: RoleSettingsApi; readonly voyageId: string }) => (
	<Live input={{ voyageId: props.voyageId }} query={props.api.roleSettings.forVoyage} waiting="Reading this voyage's role settings…">
		{(rows) => (
			<Live input={{}} query={props.api.roleSettings.defaults} waiting="Reading the fleet's defaults…">
				{(fleet) => <RoleForms choose={props.api.roleSettings.choose} placeholdersOf={inheriting(fleet)} rows={rows} />}
			</Live>
		)}
	</Live>
);
