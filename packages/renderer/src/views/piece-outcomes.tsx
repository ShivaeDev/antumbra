import type { ArtifactView, PieceView, ReportView } from "@antumbra/contract";
import { openArtifact } from "#adapters/trpc-voyages.ts";
import { ChangeChip } from "#views/change-chip.tsx";
import {
	columnStyle,
	mutedStyle,
	quietButtonStyle,
	rowStyle,
} from "#views/styles.ts";

const ReportChip = ({ report }: { readonly report: ReportView }) => (
	<span style={mutedStyle}>📄 {report.title}</span>
);

const ArtifactChip = ({
	artifact,
	onError,
}: {
	readonly artifact: ArtifactView;
	readonly onError: (message: string) => void;
}) => (
	<button
		onClick={() => openArtifact(artifact.id, onError)}
		style={quietButtonStyle}
		title={`${artifact.byteSize.toLocaleString()} bytes · ${artifact.digest}`}
		type="button"
	>
		🖼 {artifact.title}
	</button>
);

const ArtifactHistory = ({
	artifacts,
	onError,
}: {
	readonly artifacts: ReadonlyArray<ArtifactView>;
	readonly onError: (message: string) => void;
}) =>
	artifacts.length === 0 ? null : (
		<details>
			<summary style={mutedStyle}>History</summary>
			<div style={{ ...rowStyle, flexWrap: "wrap", paddingTop: "0.35rem" }}>
				{artifacts.map((artifact) => (
					<ArtifactChip
						artifact={artifact}
						key={artifact.id}
						onError={onError}
					/>
				))}
			</div>
		</details>
	);

// why: a change takes its time to land, so it reads as its own line rather
// than as one chip among the outcomes that were done the moment they landed.
export const PieceOutcomes = ({
	onError,
	piece,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
}) => {
	const written = piece.reports.length + piece.artifacts.length;
	if (
		written === 0 &&
		piece.artifactHistory.length === 0 &&
		piece.changes.length === 0
	) {
		return null;
	}
	return (
		<div style={columnStyle}>
			{written === 0 ? null : (
				<div style={{ ...rowStyle, flexWrap: "wrap" }}>
					{piece.reports.map((report) => (
						<ReportChip key={report.id} report={report} />
					))}
					{piece.artifacts.map((artifact) => (
						<ArtifactChip
							artifact={artifact}
							key={artifact.id}
							onError={onError}
						/>
					))}
				</div>
			)}
			{piece.changes.map((change) => (
				<ChangeChip change={change} key={change.id} />
			))}
			<ArtifactHistory artifacts={piece.artifactHistory} onError={onError} />
		</div>
	);
};
