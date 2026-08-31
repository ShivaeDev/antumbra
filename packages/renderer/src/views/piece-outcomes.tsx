import type { PieceView } from "@antumbra/contract";
import { ArtifactOutcomes } from "#views/artifact-outcomes.tsx";
import { ChangeChip } from "#views/change-chip.tsx";
import { ReportOutcomes } from "#views/report-outcomes.tsx";

export const PieceOutcomes = ({ onError, piece }: { readonly onError: (message: string) => void; readonly piece: PieceView }) => {
	if (piece.reports.length === 0 && piece.artifacts.length === 0 && piece.artifactHistory.length === 0 && piece.changes.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<ReportOutcomes reports={piece.reports} />
			<ArtifactOutcomes current={piece.artifacts} history={piece.artifactHistory} onError={onError} />
			{piece.changes.map((change) => (
				<ChangeChip change={change} key={change.id} />
			))}
		</div>
	);
};
