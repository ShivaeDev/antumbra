import type { ArtifactMarkdown, ArtifactView } from "@antumbra/contract";
import { useState } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { type CallState, useCall } from "#hooks/call.ts";
import {
	OutcomeChips,
	type OutcomeDetail,
	OutcomeDetailView,
	type OutcomeRef,
} from "#views/outcome-detail.tsx";
import { mutedStyle } from "#views/styles.ts";

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

export const ArtifactOutcomes = ({
	current,
	history,
}: {
	readonly current: ReadonlyArray<ArtifactView>;
	readonly history: ReadonlyArray<ArtifactView>;
}) => {
	const [asked, setAsked] = useState("");
	const read = useCall<ArtifactMarkdown>();
	const open = (artifact: OutcomeRef): void => {
		setAsked(artifact.title);
		read.run((onDone, onError) =>
			readArtifactMarkdown(artifact.id, onDone, onError),
		);
	};
	const detail = detailOf(read.state, asked);
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
			{detail === undefined ? null : (
				<OutcomeDetailView
					detail={detail}
					onClose={read.reset}
					reading="reading Artifact…"
				/>
			)}
		</>
	);
};
