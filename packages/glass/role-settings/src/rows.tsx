import type { RoleDefault } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { Choose } from "#glass.ts";
import { captionsOf, placeholdersOf } from "#resolved.ts";

const FIXED = ["role"] as const;

export const RoleForms = (props: { readonly choose: Choose; readonly rows: readonly (typeof RoleDefault.Type)[] }) => (
	<div className="flex flex-col gap-1">
		{props.rows.map((row, place) => (
			<CommandForm
				captions={captionsOf(row.resolved)}
				command={props.choose}
				fixed={FIXED}
				key={String(row.id)}
				placeholders={placeholdersOf(row.resolved)}
				row={row}
				titles={place === 0}
			/>
		))}
	</div>
);
