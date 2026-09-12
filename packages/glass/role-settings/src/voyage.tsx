import { Live } from "@antumbra/glass-client/live.tsx";
import type { RoleSettingsApi } from "#glass.ts";
import { RoleForms } from "#rows.tsx";

export const VoyageRoleSettings = (props: { readonly api: RoleSettingsApi; readonly voyageId: string }) => (
	<div className="flex flex-col gap-1">
		<p className="text-2xs text-muted-foreground">
			Captain and crew run on the fleet defaults unless set here; an empty field shows what it inherits and from where.
		</p>
		<Live input={{ voyageId: props.voyageId }} query={props.api.roleSettings.forVoyage} waiting="Reading this voyage's role settings…">
			{(rows) => <RoleForms choose={props.api.roleSettings.choose} rows={rows} />}
		</Live>
	</div>
);
