import type {
	ConsoleMode,
	ConsolePlace,
	Fleet,
	VoyageSummary,
} from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useEffect, useState } from "react";
import { loadAppInfo, watchFleet } from "#adapters/trpc.ts";
import { watchVoyages } from "#adapters/trpc-voyages.ts";
import { rememberPlace } from "#adapters/trpc-windows.ts";
import { ConsoleMain } from "#views/console-main.tsx";
import { FleetAside } from "#views/fleet-aside.tsx";
import { ModeStrip } from "#views/mode-strip.tsx";
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

export const ConsoleApp = ({ place }: { readonly place: ConsolePlace }) => {
	const info = useAtomValue(appInfoAtom);
	const [fleet, setFleet] = useState<Fleet | undefined>(undefined);
	const [voyages, setVoyages] = useState<ReadonlyArray<VoyageSummary>>([]);
	const [mode, setMode] = useState<ConsoleMode>(place.mode);
	const [session, setSession] = useState(place.sessionId ?? undefined);
	const [voyage, setVoyage] = useState(place.voyageId ?? undefined);
	const [notice, setNotice] = useState<string | undefined>(undefined);

	useEffect(() => watchFleet(setFleet, setNotice), []);
	useEffect(() => watchVoyages(setVoyages, setNotice), []);
	// why: where the console is pointed is main's to keep, so a reload comes
	// back to it rather than to whatever a first render would have shown.
	useEffect(() => {
		rememberPlace(
			{
				mode,
				role: "console",
				sessionId: session ?? null,
				voyageId: voyage ?? null,
			},
			setNotice,
		);
	}, [mode, session, voyage]);

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
			<ConsoleMain
				fleet={fleet}
				mode={mode}
				onError={setNotice}
				session={session}
				voyage={voyage}
			/>
		</main>
	);
};
