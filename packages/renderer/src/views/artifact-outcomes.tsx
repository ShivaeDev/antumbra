import type { ArtifactMarkdown, ArtifactView } from "@antumbra/contract";
import { useState } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { ArtifactMarkdownView } from "#views/artifact-markdown.tsx";
import {
	columnStyle,
	mutedStyle,
	quietButtonStyle,
	rowStyle,
} from "#views/styles.ts";

type ArtifactDetail =
	| {
			readonly _tag: "failed";
			readonly message: string;
			readonly title: string;
	  }
	| { readonly _tag: "loaded"; readonly artifact: ArtifactMarkdown }
	| { readonly _tag: "loading"; readonly title: string };

const ArtifactChips = ({
	artifacts,
	disabled,
	onOpen,
}: {
	readonly artifacts: ReadonlyArray<ArtifactView>;
	readonly disabled: boolean;
	readonly onOpen: (artifact: ArtifactView) => void;
}) => (
	<div style={{ ...rowStyle, flexWrap: "wrap" }}>
		{artifacts.map((artifact) => (
			<button
				disabled={disabled}
				key={artifact.id}
				onClick={() => onOpen(artifact)}
				style={{ ...quietButtonStyle, color: mutedStyle.color }}
				type="button"
			>
				🖼 {artifact.title}
			</button>
		))}
	</div>
);

const ArtifactDetailView = ({
	detail,
	onClose,
}: {
	readonly detail: ArtifactDetail;
	readonly onClose: () => void;
}) => (
	<div style={columnStyle}>
		<div style={rowStyle}>
			<strong>
				{detail._tag === "loaded" ? detail.artifact.title : detail.title}
			</strong>
			{detail._tag === "loading" ? null : (
				<button onClick={onClose} style={quietButtonStyle} type="button">
					close
				</button>
			)}
		</div>
		{detail._tag === "loading" ? (
			<span style={mutedStyle}>reading Artifact…</span>
		) : null}
		{detail._tag === "failed" ? (
			<span style={{ color: "#ff7c7c" }}>{detail.message}</span>
		) : null}
		{detail._tag === "loaded" ? (
			<ArtifactMarkdownView markdown={detail.artifact.markdown} />
		) : null}
	</div>
);

export const ArtifactOutcomes = ({
	current,
	history,
}: {
	readonly current: ReadonlyArray<ArtifactView>;
	readonly history: ReadonlyArray<ArtifactView>;
}) => {
	const [detail, setDetail] = useState<ArtifactDetail | undefined>(undefined);
	const open = (artifact: ArtifactView): void => {
		setDetail({ _tag: "loading", title: artifact.title });
		readArtifactMarkdown(
			artifact.id,
			(loaded) => setDetail({ _tag: "loaded", artifact: loaded }),
			(message) =>
				setDetail({ _tag: "failed", message, title: artifact.title }),
		);
	};
	const loading = detail?._tag === "loading";
	if (current.length === 0 && history.length === 0) return null;
	return (
		<>
			<ArtifactChips artifacts={current} disabled={loading} onOpen={open} />
			{history.length === 0 ? null : (
				<details>
					<summary style={mutedStyle}>History</summary>
					<div style={{ paddingTop: "0.35rem" }}>
						<ArtifactChips
							artifacts={history}
							disabled={loading}
							onOpen={open}
						/>
					</div>
				</details>
			)}
			{detail === undefined ? null : (
				<ArtifactDetailView
					detail={detail}
					onClose={() => setDetail(undefined)}
				/>
			)}
		</>
	);
};
