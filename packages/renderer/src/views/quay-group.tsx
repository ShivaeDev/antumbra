import type { QuayGroup, QuayRow } from "@antumbra/contract";
import { groupTitle } from "#quay/groups.ts";
import { QuayCard } from "#views/quay-card.tsx";

// why: a group nobody is waiting on says nothing worth a heading — the quay is
// read for what is owed, and an empty rung is noise between the ones that are.
export const QuayGroupPanel = ({
	group,
	onError,
	rows,
}: {
	readonly group: QuayGroup;
	readonly onError: (message: string) => void;
	readonly rows: ReadonlyArray<QuayRow>;
}) => {
	if (rows.length === 0) {
		return null;
	}
	return (
		<section className="flex min-w-0 flex-col gap-1.5">
			<div className="flex items-baseline gap-1.5">
				<h3 className="text-xs font-medium">{groupTitle[group]}</h3>
				<span className="text-2xs text-muted-foreground">{rows.length}</span>
			</div>
			{rows.map((row) => (
				<QuayCard
					key={`${row.change.id}/${row.pieceId}/${row.voyageId}`}
					onError={onError}
					row={row}
				/>
			))}
		</section>
	);
};
