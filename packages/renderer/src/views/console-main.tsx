import type { ConsoleMode, Fleet } from "@antumbra/contract";
import { QuayPanel } from "#views/quay.tsx";
import { SessionMessage } from "#views/session-message.tsx";
import { TranscriptView } from "#views/transcript.tsx";
import { VoyagePanel } from "#views/voyage.tsx";

const emptyStyle: React.CSSProperties = { color: "#8a8f98", margin: "auto" };

const sessionStyle: React.CSSProperties = {
	display: "flex",
	flex: 1,
	flexDirection: "column",
	minWidth: 0,
};

export const ConsoleMain = ({
	fleet,
	mode,
	onError,
	session,
	voyage,
}: {
	readonly fleet: Fleet | undefined;
	readonly mode: ConsoleMode;
	readonly onError: (message: string) => void;
	readonly session: string | undefined;
	readonly voyage: string | undefined;
}) => {
	if (mode === "quay") {
		return <QuayPanel onError={onError} />;
	}
	if (mode === "voyages") {
		return voyage === undefined ? (
			<section style={emptyStyle}>select a voyage to see its pieces</section>
		) : (
			<VoyagePanel onError={onError} voyageId={voyage} />
		);
	}
	return session === undefined ? (
		<section style={emptyStyle}>
			select a session to watch its transcript
		</section>
	) : (
		<section style={sessionStyle}>
			<TranscriptView sessionId={session} />
			<SessionMessage fleet={fleet} onError={onError} sessionId={session} />
		</section>
	);
};
