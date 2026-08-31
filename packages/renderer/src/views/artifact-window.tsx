import type { ArtifactMarkdown } from "@antumbra/contract";
import { useEffect } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { useCall } from "#hooks/call.ts";
import { OutcomeMarkdownView } from "#views/outcome-markdown.tsx";

export const ArtifactWindow = ({ artifactId }: { readonly artifactId: string }) => {
	const read = useCall<ArtifactMarkdown>();
	const state = read.state;

	useEffect(() => {
		read.run((onDone, onError) => readArtifactMarkdown(artifactId, onDone, onError));
	}, [artifactId]);

	useEffect(() => {
		if (state._tag === "done") {
			document.title = state.value.title;
		}
	}, [state]);

	return (
		<main className="flex h-screen min-w-0 flex-col overflow-y-auto bg-background p-5 text-foreground">
			{state._tag === "failed" ? <span className="text-xs text-destructive wrap-anywhere">{state.message}</span> : null}
			{state._tag === "done" ? <OutcomeMarkdownView markdown={state.value.markdown} /> : null}
			{state._tag === "done" || state._tag === "failed" ? null : <span className="text-xs text-muted-foreground">reading Artifact…</span>}
		</main>
	);
};
