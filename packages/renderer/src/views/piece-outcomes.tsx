import type { ArtifactView, PieceView, ReportView } from "@antumbra/contract";
import { mutedStyle, rowStyle } from "#views/styles.ts";
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

export const PieceOutcomes = ({ piece }: { readonly piece: PieceView }) => {
	if (piece.reports.length === 0 && piece.artifacts.length === 0) {
		return null;
	}
	return (
		<div style={{ ...rowStyle, flexWrap: "wrap" }}>
			{piece.reports.map((report) => (
				<ReportChip key={report.id} report={report} />
			))}
			{piece.artifacts.map((artifact) => (
				<ArtifactChip artifact={artifact} key={artifact.id} />
			))}
		</div>
	);
};
