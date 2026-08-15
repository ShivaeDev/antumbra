import type { Fleet } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useEffect, useState } from "react";
import { loadAppInfo, watchFleet } from "#adapters/trpc.ts";
import { FleetPanel } from "#views/fleet.tsx";
import { SpawnForm } from "#views/spawn-form.tsx";
import { TranscriptView } from "#views/transcript.tsx";

const appInfoAtom = Atom.make(loadAppInfo);

export const App = () => {
	const info = useAtomValue(appInfoAtom);
	const [fleet, setFleet] = useState<Fleet | undefined>(undefined);
	const [selected, setSelected] = useState<string | undefined>(undefined);
	const [notice, setNotice] = useState<string | undefined>(undefined);

	useEffect(() => watchFleet(setFleet, setNotice), []);

	return (
		<main
			style={{
				background: "#16181d",
				color: "#e4e2dd",
				display: "flex",
				fontFamily: "system-ui",
				height: "100vh",
			}}
		>
			<aside
				style={{
					borderRight: "1px solid #2e323a",
					display: "flex",
					flexDirection: "column",
					gap: "1.2rem",
					overflowY: "auto",
					padding: "1rem",
					width: "20rem",
				}}
			>
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
				<SpawnForm backends={fleet?.backends ?? []} onError={setNotice} />
				<FleetPanel
					fleet={fleet}
					onError={setNotice}
					onSelect={setSelected}
					selected={selected}
				/>
			</aside>
			{selected === undefined ? (
				<section style={{ color: "#8a8f98", margin: "auto" }}>
					select a session to watch its transcript
				</section>
			) : (
				<TranscriptView sessionId={selected} />
			)}
		</main>
	);
};
