import type { ArtifactView } from "@antumbra/contract";
import { useState } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import {
	OutcomeChips,
	type OutcomeDetail,
	OutcomeDetailView,
	type OutcomeRef,
} from "#views/outcome-detail.tsx";
import { mutedStyle } from "#views/styles.ts";

export const ArtifactOutcomes = ({
	current,
	history,
}: {
	readonly current: ReadonlyArray<ArtifactView>;
	readonly history: ReadonlyArray<ArtifactView>;
}) => {
	const [detail, setDetail] = useState<OutcomeDetail | undefined>(undefined);
	const open = (artifact: OutcomeRef): void => {
		setDetail({ _tag: "loading", title: artifact.title });
		readArtifactMarkdown(
			artifact.id,
			(loaded) =>
				setDetail({
					_tag: "loaded",
					markdown: loaded.markdown,
					title: loaded.title,
				}),
			(message) =>
				setDetail({ _tag: "failed", message, title: artifact.title }),
		);
	};
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
					onClose={() => setDetail(undefined)}
					reading="reading Artifact…"
				/>
			)}
		</>
	);
};
