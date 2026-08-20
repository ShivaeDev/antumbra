import type { ArtifactMarkdown, ArtifactView } from "@antumbra/contract";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { useCall } from "#hooks/call.ts";
import { OutcomeChips, OutcomeDetailView } from "#views/outcome-detail.tsx";
import { detailOf, type OutcomeRef } from "#views/outcome-read.ts";

const named = (artifact: ArtifactMarkdown) => ({
	markdown: artifact.markdown,
	title: artifact.title,
});

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
	const detail = detailOf(read.state, asked, named);
	const loading = detail?._tag === "loading";
	if (current.length === 0 && history.length === 0) return null;
	return (
		<>
			<OutcomeChips
				disabled={loading}
				icon={<ImageIcon />}
				onOpen={open}
				outcomes={current}
			/>
			{history.length === 0 ? null : (
				<details>
					<summary className="cursor-default text-2xs text-muted-foreground">
						History
					</summary>
					<div className="pt-1.5">
						<OutcomeChips
							disabled={loading}
							icon={<ImageIcon />}
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
					reading="Reading the Artifact…"
				/>
			)}
		</>
	);
};
