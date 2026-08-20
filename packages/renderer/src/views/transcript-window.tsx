import { TranscriptView } from "#views/transcript.tsx";

// why: a detached transcript is the console's feed without the asides — the
// window is titled with its session, so the page does not say it again, and
// it watches rather than speaks: sending stays where the fleet is in view.
export const TranscriptWindow = ({
	sessionId,
}: {
	readonly sessionId: string;
}) => (
	<main className="flex h-screen min-w-0 flex-col bg-background text-foreground">
		<TranscriptView sessionId={sessionId} />
	</main>
);
