import type { Fleet, VoyageSummary } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useEffect, useState } from "react";
import { loadAppInfo, watchFleet } from "#adapters/trpc.ts";
import { watchVoyages } from "#adapters/trpc-voyages.ts";
import { FleetAside } from "#views/fleet-aside.tsx";
import { type Mode, ModeStrip } from "#views/mode-strip.tsx";
import { QuayPanel } from "#views/quay.tsx";
import { SessionMessage } from "#views/session-message.tsx";
import { TranscriptView } from "#views/transcript.tsx";
import { VoyagePanel } from "#views/voyage.tsx";
import { VoyagesAside } from "#views/voyages-aside.tsx";

const appInfoAtom = Atom.make(loadAppInfo);

const mainStyle: React.CSSProperties = {
	background: "#16181d",
	color: "#e4e2dd",
	display: "flex",
	fontFamily: "system-ui",
	height: "100vh",
};

// why: the aside is a fixed column, not a measuring stick — a long branch or
// path inside it wraps or clips within its width instead of widening the
// window or opening a sideways bar across the whole app.
const asideStyle: React.CSSProperties = {
	borderRight: "1px solid #2e323a",
	display: "flex",
	flexDirection: "column",
	gap: "1.2rem",
	minWidth: 0,
	overflowX: "hidden",
	overflowY: "auto",
	padding: "1rem",
	width: "20rem",
};

const emptyStyle: React.CSSProperties = { color: "#8a8f98", margin: "auto" };

const sessionStyle: React.CSSProperties = {
	display: "flex",
	flex: 1,
	flexDirection: "column",
	minWidth: 0,
};

const MainSection = ({
	fleet,
	mode,
	onError,
	session,
	voyage,
}: {
	readonly fleet: Fleet | undefined;
	readonly mode: Mode;
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

export const App = () => {
	const info = useAtomValue(appInfoAtom);
	const [fleet, setFleet] = useState<Fleet | undefined>(undefined);
	const [voyages, setVoyages] = useState<ReadonlyArray<VoyageSummary>>([]);
	const [mode, setMode] = useState<Mode>("fleet");
	const [session, setSession] = useState<string | undefined>(undefined);
	const [voyage, setVoyage] = useState<string | undefined>(undefined);
	const [notice, setNotice] = useState<string | undefined>(undefined);

	useEffect(() => watchFleet(setFleet, setNotice), []);
	useEffect(() => watchVoyages(setVoyages, setNotice), []);

	return (
		<main style={mainStyle}>
			<aside style={asideStyle}>
				<header>
					<h1 style={{ fontSize: "1.1rem", margin: 0 }}>Antumbra</h1>
					<span style={{ color: "#8a8f98", fontSize: "0.75rem" }}>
						{AsyncResult.matchWithError(info, {
							onDefect: () => "fix lost",
							onError: () => "fix lost",
							onInitial: () => "taking a sight…",
							onSuccess: (success) => `v${success.value.productVersion}`,
						})}
					</span>
				</header>
				{notice === undefined ? null : (
					<div style={{ color: "#ff7c7c", fontSize: "0.85rem" }}>{notice}</div>
				)}
				<ModeStrip mode={mode} onMode={setMode} />
				{/* why: the quay is read against the voyages the work is owed to, so
				the aside keeps listing them rather than emptying itself. */}
				{mode === "fleet" ? (
					<FleetAside
						fleet={fleet}
						onError={setNotice}
						onSelect={setSession}
						selected={session}
					/>
				) : (
					<VoyagesAside
						backends={fleet?.backends ?? []}
						onError={setNotice}
						onSelect={setVoyage}
						selected={voyage}
						voyages={voyages}
					/>
				)}
			</aside>
			<MainSection
				fleet={fleet}
				mode={mode}
				onError={setNotice}
				session={session}
				voyage={voyage}
			/>
		</main>
	);
};
