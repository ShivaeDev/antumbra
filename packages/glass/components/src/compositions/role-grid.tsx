import { Fragment, type ReactNode } from "react";

export const RoleGrid = ({
	columns,
	rows,
}: {
	readonly columns: readonly string[];
	readonly rows: readonly { readonly cells: ReactNode; readonly label: string }[];
}) => (
	<div className="grid grid-cols-[96px_repeat(3,176px)] items-center gap-x-3 gap-y-2">
		<span />
		{columns.map((column) => (
			<span className="text-xs text-muted-foreground" key={column}>
				{column}
			</span>
		))}
		{rows.map((row) => (
			<Fragment key={row.label}>
				<span className="truncate text-sm">{row.label}</span>
				{row.cells}
			</Fragment>
		))}
	</div>
);
