import type { ArtifactMarkdown, ArtifactView } from "@antumbra/contract";
import { useState } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { openWindow } from "#adapters/trpc-windows.ts";
import { type CallState, useCall } from "#hooks/call.ts";
import {
	OutcomeChips,
	type OutcomeDetail,
	OutcomeDetailView,
	type OutcomeRef,
} from "#views/outcome-detail.tsx";
import { mutedStyle, quietButtonStyle } from "#views/styles.ts";

// why: while the read is in flight the pane is titled by the chip that was
// clicked; once it lands the Artifact names itself.
const detailOf = (
	state: CallState<ArtifactMarkdown>,
	asked: string,
): OutcomeDetail | undefined => {
	if (state._tag === "idle") return undefined;
	if (state._tag === "pending") return { _tag: "loading", title: asked };
	if (state._tag === "failed") {
		return { _tag: "failed", message: state.message, title: asked };
	}
	return {
		_tag: "loaded",
		markdown: state.value.markdown,
		title: state.value.title,
	};
};

// why: asking twice for the same Artifact brings the window it already has
// forward rather than minting a second one, so the control keeps being
// offered while that window is open.
const OpenInWindow = ({
	artifactId,
	onError,
}: {
	readonly artifactId: string;
	readonly onError: (message: string) => void;
}) => (
	<button
		onClick={() => openWindow({ artifactId, role: "artifact" }, onError)}
		style={quietButtonStyle}
		type="button"
	>
		open in a window
	</button>
);

export const ArtifactOutcomes = ({
	current,
	history,
	onError,
}: {
	readonly current: ReadonlyArray<ArtifactView>;
	readonly history: ReadonlyArray<ArtifactView>;
	readonly onError: (message: string) => void;
}) => {
	const [asked, setAsked] = useState<OutcomeRef | undefined>(undefined);
	const read = useCall<ArtifactMarkdown>();
	const open = (artifact: OutcomeRef): void => {
		setAsked(artifact);
		read.run((onDone, failed) =>
			readArtifactMarkdown(artifact.id, onDone, failed),
		);
	};
	const detail = detailOf(read.state, asked?.title ?? "");
	const loading = detail?._tag === "loading";
	if (current.length === 0 && history.length === 0) return null;
	return (
		<>
			<OutcomeChips
				disabled={loading}
				icon="🖼"
				onOpen={open}
				outcomes={current}
			/>
			{history.length === 0 ? null : (
				<details>
					<summary style={mutedStyle}>History</summary>
					<div style={{ paddingTop: "0.35rem" }}>
						<OutcomeChips
							disabled={loading}
							icon="🖼"
							onOpen={open}
							outcomes={history}
						/>
					</div>
				</details>
			)}
			{detail === undefined || asked === undefined ? null : (
				<OutcomeDetailView
					action={<OpenInWindow artifactId={asked.id} onError={onError} />}
					detail={detail}
					onClose={read.reset}
					reading="reading Artifact…"
				/>
			)}
		</>
	);
};
