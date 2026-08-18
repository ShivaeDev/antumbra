import type { ArtifactView, PieceView, ReportView } from "@antumbra/contract";
import { ChangeChip } from "#views/change-chip.tsx";
import { columnStyle, mutedStyle, rowStyle } from "#views/styles.ts";
import { artifactHref } from "#voyages/labels.ts";

const ReportChip = ({ report }: { readonly report: ReportView }) => (
	<span style={mutedStyle}>📄 {report.title}</span>
);

const ArtifactChip = ({ artifact }: { readonly artifact: ArtifactView }) => {
	const href = artifactHref(artifact.uri);
	if (href === undefined) {
		return <span style={mutedStyle}>🖼 {artifact.title}</span>;
	}
	return (
		<a href={href} style={{ color: "#7c9cff", fontSize: "0.75rem" }}>
			🖼 {artifact.title}
		</a>
	);
};

// why: a change takes its time to land, so it reads as its own line rather
// than as one chip among the outcomes that were done the moment they landed.
export const PieceOutcomes = ({ piece }: { readonly piece: PieceView }) => {
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
						<ArtifactChip artifact={artifact} key={artifact.id} />
					))}
				</div>
			)}
			{piece.changes.map((change) => (
				<ChangeChip change={change} key={change.id} />
			))}
			{piece.artifactHistory.length === 0 ? null : (
				<details>
					<summary style={mutedStyle}>History</summary>
					<div style={{ ...rowStyle, flexWrap: "wrap", paddingTop: "0.35rem" }}>
						{piece.artifactHistory.map((artifact) => (
							<ArtifactChip artifact={artifact} key={artifact.id} />
						))}
					</div>
				</details>
			)}
		</div>
	);
};
