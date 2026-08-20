import { TranscriptView } from "#views/transcript.tsx";

const windowStyle: React.CSSProperties = {
	background: "#16181d",
	color: "#e4e2dd",
	display: "flex",
	flexDirection: "column",
	fontFamily: "system-ui",
	height: "100vh",
	minWidth: 0,
};

// why: a detached transcript is the console's feed without the asides — the
// window is titled with its session, so the page does not say it again, and
// it watches rather than speaks: sending stays where the fleet is in view.
export const TranscriptWindow = ({
	sessionId,
}: {
	readonly sessionId: string;
}) => (
	<main style={windowStyle}>
		<TranscriptView sessionId={sessionId} />
	</main>
);
