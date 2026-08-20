import { useState } from "react";
import { watchFleet } from "#adapters/trpc.ts";
import { watchVoyages } from "#adapters/trpc-voyages.ts";
import { useFeed } from "#hooks/feed.ts";
import type { Mode } from "#views/mode-nav.tsx";
import { ModeSurface } from "#views/mode-surface.tsx";
import { NavRail } from "#views/nav-rail.tsx";
import { NoticeBar } from "#views/notice-bar.tsx";

export const App = () => {
	const { error: fleetError, value: fleet } = useFeed("fleet", watchFleet);
	const { error: voyagesError, value: voyages } = useFeed(
		"voyages",
		watchVoyages,
	);
	const [mode, setMode] = useState<Mode>("fleet");
	const [session, setSession] = useState<string | undefined>(undefined);
	const [voyage, setVoyage] = useState<string | undefined>(undefined);
	const [notice, setNotice] = useState<string | undefined>(undefined);
	const feedErrors = [fleetError, voyagesError].flatMap((error) =>
		error === undefined ? [] : [error],
	);

	return (
		<div className="flex h-screen min-w-0 bg-background text-foreground">
			<NavRail mode={mode} onMode={setMode} />
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">
				<NoticeBar
					feedErrors={feedErrors}
					notice={notice}
					onDismiss={() => setNotice(undefined)}
				/>
				<ModeSurface
					fleet={fleet}
					mode={mode}
					onError={setNotice}
					onSession={setSession}
					onVoyage={setVoyage}
					session={session}
					voyage={voyage}
					voyages={voyages ?? []}
				/>
			</main>
		</div>
	);
};
