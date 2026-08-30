import type { ConsolePlace } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { watchFleet } from "#adapters/trpc.ts";
import { watchVoyages } from "#adapters/trpc-voyages.ts";
import { rememberPlace } from "#adapters/trpc-windows.ts";
import type { Navigate } from "#console/navigation.ts";
import { useFeed } from "#hooks/feed.ts";
import { discardMissingSessionDrafts } from "#session-drafts/store.ts";
import { ConsoleMain } from "#views/console-main.tsx";
import { NavRail } from "#views/nav-rail.tsx";
import { NoticeBar } from "#views/notice-bar.tsx";

export const ConsoleApp = ({
	place: opened,
}: {
	readonly place: ConsolePlace;
}) => {
	const { error: fleetError, value: fleet } = useFeed("fleet", watchFleet);
	const { error: voyagesError, value: voyages } = useFeed(
		"voyages",
		watchVoyages,
	);
	// why: where the console is pointed is one value, so a page that sends the
	// reader to another page changes the mode and the selection in one step
	// and main is told about one place rather than two halves of it.
	const [place, setPlace] = useState<ConsolePlace>(opened);
	const [notice, setNotice] = useState<string | undefined>(undefined);
	const navigate: Navigate = (target) =>
		setPlace((current) => ({ ...current, ...target }));
	const feedErrors = [fleetError, voyagesError].flatMap((error) =>
		error === undefined ? [] : [error],
	);

	// why: where the console is pointed is main's to keep, so a reload comes
	// back to it rather than to whatever a first render would have shown.
	useEffect(() => {
		rememberPlace(place, setNotice);
	}, [place]);

	// why: Sessions ordinarily remain in the durable fleet after they end. Only
	// absence from a complete fleet sight means a stored local draft has lost
	// its subject and may be discarded.
	useEffect(() => {
		if (fleet === undefined) {
			return;
		}
		discardMissingSessionDrafts(
			new Set(
				fleet.agents.flatMap((agent) => agent.sessions.map((held) => held.id)),
			),
		);
	}, [fleet]);

	return (
		<div className="flex h-screen min-w-0 bg-background text-foreground">
			<NavRail
				mode={place.mode}
				onMode={(mode) => setPlace((current) => ({ ...current, mode }))}
			/>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">
				<NoticeBar
					feedErrors={feedErrors}
					notice={notice}
					onDismiss={() => setNotice(undefined)}
				/>
				<ConsoleMain
					change={place.changeId ?? undefined}
					fleet={fleet}
					mode={place.mode}
					onChange={(changeId) =>
						setPlace((current) => ({ ...current, changeId: changeId ?? null }))
					}
					onError={setNotice}
					onNavigate={navigate}
					onSession={(sessionId) =>
						setPlace((current) => ({
							...current,
							sessionId: sessionId ?? null,
						}))
					}
					piece={place.pieceId ?? undefined}
					session={place.sessionId ?? undefined}
					voyage={place.voyageId ?? undefined}
					voyages={voyages ?? []}
				/>
			</main>
		</div>
	);
};
