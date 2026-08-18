import type { PieceView, ReportView } from "@antumbra/contract";
import { ArtifactOutcomes } from "#views/artifact-outcomes.tsx";
import { ChangeChip } from "#views/change-chip.tsx";
import { columnStyle, mutedStyle, rowStyle } from "#views/styles.ts";

const ReportChip = ({ report }: { readonly report: ReportView }) => (
	<span style={mutedStyle}>📄 {report.title}</span>
);

// why: a change takes its time to land, so it reads as its own line rather
// than as one chip among the outcomes that were done the moment they landed.
export const PieceOutcomes = ({ piece }: { readonly piece: PieceView }) => {
	if (
		piece.reports.length === 0 &&
		piece.artifacts.length === 0 &&
		piece.artifactHistory.length === 0 &&
		piece.changes.length === 0
	) {
		return null;
	}
	return (
		<div style={columnStyle}>
			{piece.reports.length === 0 ? null : (
				<div style={{ ...rowStyle, flexWrap: "wrap" }}>
					{piece.reports.map((report) => (
						<ReportChip key={report.id} report={report} />
					))}
				</div>
			)}
			<ArtifactOutcomes
				current={piece.artifacts}
				history={piece.artifactHistory}
			/>
			{piece.changes.map((change) => (
				<ChangeChip change={change} key={change.id} />
			))}
		</div>
	);
};
