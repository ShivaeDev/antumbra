import type { QuayGroup, QuayRow } from "@antumbra/contract";
import { groupTitle } from "#quay/groups.ts";
import { ChangeLink } from "#views/change-chip.tsx";
import {
	cardStyle,
	columnStyle,
	headingStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";
import { changeMarks } from "#voyages/change-marks.ts";
import { whenLabel } from "#voyages/labels.ts";

const QuayCard = ({ row }: { readonly row: QuayRow }) => (
	<div style={cardStyle}>
		<div style={{ ...rowStyle, flexWrap: "wrap" }}>
			<strong>{row.change.repoName}</strong>
			<ChangeLink change={row.change} />
		</div>
		<span style={mutedStyle}>
			{row.voyageName} › {row.pieceTitle}
		</span>
		<div style={{ ...rowStyle, flexWrap: "wrap" }}>
			<span style={mutedStyle}>{changeMarks(row.change)}</span>
			<span style={mutedStyle}>
				observed {whenLabel(row.change.observedAt)}
			</span>
		</div>
	</div>
);

// why: a group nobody is waiting on says nothing worth a heading — the quay is
// read for what is owed, and an empty rung is noise between the ones that are.
export const QuayGroupPanel = ({
	group,
	rows,
}: {
	readonly group: QuayGroup;
	readonly rows: ReadonlyArray<QuayRow>;
}) => {
	if (rows.length === 0) {
		return null;
	}
	return (
		<div style={columnStyle}>
			<h3 style={headingStyle}>{groupTitle[group]}</h3>
			{rows.map((row) => (
				<QuayCard
					key={`${row.change.id}/${row.pieceId}/${row.voyageId}`}
					row={row}
				/>
			))}
		</div>
	);
};
