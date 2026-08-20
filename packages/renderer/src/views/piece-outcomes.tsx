import type { PieceView } from "@antumbra/contract";
import { ArtifactOutcomes } from "#views/artifact-outcomes.tsx";
import { ChangeChip } from "#views/change-chip.tsx";
import { ReportOutcomes } from "#views/report-outcomes.tsx";
import { columnStyle } from "#views/styles.ts";

// why: a change takes its time to land, so it reads as its own line rather
// than as one chip among the outcomes that were done the moment they landed.
export const PieceOutcomes = ({
	onError,
	piece,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
}) => {
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
			<ReportOutcomes reports={piece.reports} />
			<ArtifactOutcomes
				current={piece.artifacts}
				history={piece.artifactHistory}
				onError={onError}
			/>
			{piece.changes.map((change) => (
				<ChangeChip change={change} key={change.id} />
			))}
		</div>
	);
};
