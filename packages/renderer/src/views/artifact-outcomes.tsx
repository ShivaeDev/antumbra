import type { ArtifactMarkdown, ArtifactView } from "@antumbra/contract";
import { ImageIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import { useState } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { openWindow } from "#adapters/trpc-windows.ts";
import { Button } from "#components/ui/button.tsx";
import { useCall } from "#hooks/call.ts";
import { OutcomeChips, OutcomeDetailView } from "#views/outcome-detail.tsx";
import { detailOf, type OutcomeRef } from "#views/outcome-read.ts";

const named = (artifact: ArtifactMarkdown) => ({
	markdown: artifact.markdown,
	title: artifact.title,
});

// why: asking twice for the same Artifact brings the window it already has
// forward rather than minting a second one, so the control keeps being
// offered while that window is open.
const OpenInWindow = ({ artifactId, onError }: { readonly artifactId: string; readonly onError: (message: string) => void }) => (
	<Button
		aria-label="Open in a window"
		className="text-muted-foreground"
		onClick={() => openWindow({ artifactId, role: "artifact" }, onError)}
		size="icon"
		title="Open in a window"
		type="button"
		variant="ghost"
	>
		<SquareArrowOutUpRightIcon />
	</Button>
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
		read.run((onDone, failed) => readArtifactMarkdown(artifact.id, onDone, failed));
	};
	// why: the pane is titled by the chip that was clicked, but detaching a
	// window needs the Artifact that chip named, so what was asked for is kept
	// whole here rather than reduced to the title the shared reader wants.
	const detail = asked === undefined ? undefined : detailOf(read.state, asked.title, named);
	const loading = detail?._tag === "loading";
	if (current.length === 0 && history.length === 0) return null;
	return (
		<>
			<OutcomeChips disabled={loading} icon={<ImageIcon />} onOpen={open} outcomes={current} />
			{history.length === 0 ? null : (
				<details>
					<summary className="cursor-default text-2xs text-muted-foreground">History</summary>
					<div className="pt-1.5">
						<OutcomeChips disabled={loading} icon={<ImageIcon />} onOpen={open} outcomes={history} />
					</div>
				</details>
			)}
			{detail === undefined || asked === undefined ? null : (
				<OutcomeDetailView
					action={<OpenInWindow artifactId={asked.id} onError={onError} />}
					detail={detail}
					onClose={read.reset}
					reading="Reading the Artifact…"
				/>
			)}
		</>
	);
};
