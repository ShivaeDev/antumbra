import { Live } from "@antumbra/glass-client/live.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@antumbra/glass-components/shadcn/card.tsx";
import type { RoleSettingsApi } from "#glass.ts";
import { RoleForms } from "#rows.tsx";

export const RoleDefaults = (props: { readonly api: RoleSettingsApi }) => (
	<Card className="max-w-[720px]">
		<CardHeader>
			<CardTitle className="text-sm font-medium">Fleet defaults</CardTitle>
			<CardDescription className="text-xs">
				Each role runs on these unless a voyage sets its own; the flagship and smoother are fleet-wide.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<Live input={{}} query={props.api.roleSettings.defaults} waiting="Reading the fleet's defaults…">
				{(rows) => <RoleForms choose={props.api.roleSettings.choose} inherits="backend" rows={rows} />}
			</Live>
		</CardContent>
	</Card>
);
