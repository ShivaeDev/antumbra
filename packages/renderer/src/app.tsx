import type { ConsoleMode, ConsolePlace, SettingsReading } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { watchFleet } from "#adapters/trpc.ts";
import { loadSettings } from "#adapters/trpc-settings.ts";
import { watchVoyages } from "#adapters/trpc-voyages.ts";
import { rememberPlace } from "#adapters/trpc-windows.ts";
import { useFeed } from "#hooks/feed.ts";
import { discardMissingSessionDrafts } from "#session-drafts/store.ts";
import { ConsoleMain } from "#views/console-main.tsx";
import { NavRail } from "#views/nav-rail.tsx";
import { NoticeBar } from "#views/notice-bar.tsx";
import { ProviderCapacities } from "#views/provider-capacities.tsx";

export const ConsoleApp = ({ place }: { readonly place: ConsolePlace }) => {
	const { error: fleetError, value: fleet } = useFeed("fleet", watchFleet);
	const { error: voyagesError, value: voyages } = useFeed("voyages", watchVoyages);
	const [mode, setMode] = useState<ConsoleMode>(place.mode);
	const [change, setChange] = useState(place.changeId ?? undefined);
	const [session, setSession] = useState(place.sessionId ?? undefined);
	const [piece, setPiece] = useState(place.pieceId ?? undefined);
	const [voyage, setVoyage] = useState(place.voyageId ?? undefined);
	const [notice, setNotice] = useState<string | undefined>(undefined);
	const [settings, setSettings] = useState<SettingsReading | undefined>(undefined);
	const feedErrors = [fleetError, voyagesError].flatMap((error) => (error === undefined ? [] : [error]));

	useEffect(() => {
		loadSettings(setSettings, setNotice);
	}, []);

	// why: where the console is pointed is main's to keep, so a reload comes
	// back to it rather than to whatever a first render would have shown.
	useEffect(() => {
		rememberPlace(
			{
				changeId: change ?? null,
				mode,
				pieceId: piece ?? null,
				role: "console",
				sessionId: session ?? null,
				voyageId: voyage ?? null,
			},
			setNotice,
		);
	}, [change, mode, piece, session, voyage]);

	// why: Sessions ordinarily remain in the durable fleet after they end. Only
	// absence from a complete fleet sight means a stored local draft has lost
	// its subject and may be discarded.
	useEffect(() => {
		if (fleet === undefined) {
			return;
		}
		discardMissingSessionDrafts(new Set(fleet.agents.flatMap((agent) => agent.sessions.map((held) => held.id))));
	}, [fleet]);

	return (
		<div className="flex h-screen min-w-0 bg-background text-foreground">
			<NavRail mode={mode} onMode={setMode} />
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">
				<NoticeBar feedErrors={feedErrors} notice={notice} onDismiss={() => setNotice(undefined)} />
				{fleet === undefined ? null : <ProviderCapacities capacities={fleet.capacities} onError={setNotice} />}
				<ConsoleMain
					change={change}
					fleet={fleet}
					mode={mode}
					onChange={setChange}
					onError={setNotice}
					onPiece={(voyageId, pieceId) => {
						setMode("voyages");
						setVoyage(voyageId);
						setPiece(pieceId);
					}}
					onSession={setSession}
					onSettings={setSettings}
					onVoyage={(voyageId) => {
						setMode("voyages");
						setVoyage(voyageId);
						setPiece(undefined);
					}}
					piece={piece}
					session={session}
					settings={settings}
					voyage={voyage}
					voyages={voyages ?? []}
				/>
			</main>
		</div>
	);
};
