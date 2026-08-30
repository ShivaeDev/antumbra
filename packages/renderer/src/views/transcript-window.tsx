import type { SettingsReading } from "@antumbra/contract";
import { useEffect } from "react";
import { loadSettings } from "#adapters/trpc-settings.ts";
import { useCall } from "#hooks/call.ts";
import { TranscriptView } from "#views/transcript.tsx";

// why: a detached transcript is the console's feed without the asides — the
// window is titled with its session, so the page does not say it again, and
// it watches rather than speaks: sending stays where the fleet is in view.
//
// why: the window has no shell above it to hand the settings down, so it reads
// them once for itself. Until they arrive, and if they never do, it draws by
// the catalog's own values, which is what a setting is when nothing has read it.
export const TranscriptWindow = ({
	sessionId,
}: {
	readonly sessionId: string;
}) => {
	const read = useCall<SettingsReading>();
	const state = read.state;

	useEffect(() => {
		read.run(loadSettings);
	}, []);

	return (
		<main className="flex h-screen min-w-0 flex-col bg-background text-foreground">
			<TranscriptView
				foldToolCalls={
					state._tag === "done" && state.value.settings.foldToolCalls
				}
				sessionId={sessionId}
			/>
		</main>
	);
};
