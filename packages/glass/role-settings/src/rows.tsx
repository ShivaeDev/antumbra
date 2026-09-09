import type { Held } from "@antumbra/glass-components/fields.ts";
import { CommandForm } from "@antumbra/glass-components/form.tsx";
import type { Choose } from "#glass.ts";

const FIXED = ["role"] as const;

export const RoleForms = (props: {
	readonly choose: Choose;
	readonly placeholdersOf: (row: Held) => Readonly<Record<string, string>>;
	readonly rows: readonly Held[];
}) => (
	<div className="flex flex-col gap-1">
		{props.rows.map((row, place) => (
			<CommandForm
				command={props.choose}
				fixed={FIXED}
				key={String(row.id)}
				placeholders={props.placeholdersOf(row)}
				row={row}
				titles={place === 0}
			/>
		))}
	</div>
);
