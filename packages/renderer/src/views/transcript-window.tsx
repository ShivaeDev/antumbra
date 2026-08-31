import type { SettingsReading } from "@antumbra/contract";
import { useEffect } from "react";
import { loadSettings } from "#adapters/trpc-settings.ts";
import { useCall } from "#hooks/call.ts";
import { TranscriptView } from "#views/transcript.tsx";

export const TranscriptWindow = ({ sessionId }: { readonly sessionId: string }) => {
	const read = useCall<SettingsReading>();
	const state = read.state;

	useEffect(() => {
		read.run(loadSettings);
	}, []);

	return (
		<main className="flex h-screen min-w-0 flex-col bg-background text-foreground">
			<TranscriptView foldToolCalls={state._tag === "done" && state.value.settings.foldToolCalls} sessionId={sessionId} />
		</main>
	);
};
