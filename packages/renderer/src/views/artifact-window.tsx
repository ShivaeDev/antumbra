import type { ArtifactMarkdown } from "@antumbra/contract";
import { useEffect } from "react";
import { readArtifactMarkdown } from "#adapters/trpc-voyages.ts";
import { useCall } from "#hooks/call.ts";
import { OutcomeMarkdownView } from "#views/outcome-markdown.tsx";
import { mutedStyle } from "#views/styles.ts";

const windowStyle: React.CSSProperties = {
	background: "#16181d",
	color: "#e4e2dd",
	display: "flex",
	flexDirection: "column",
	fontFamily: "system-ui",
	height: "100vh",
	minWidth: 0,
	overflowY: "auto",
	padding: "1.25rem",
};

// why: an Artifact is immutable once it has landed, so the window reads it
// once and then has nothing to watch — no feed to keep open, nothing to
// refresh, and nothing to send. That is what makes it worth keeping open
// beside the work instead of inside it.
export const ArtifactWindow = ({
	artifactId,
}: {
	readonly artifactId: string;
}) => {
	const read = useCall<ArtifactMarkdown>();
	const state = read.state;

	useEffect(() => {
		read.run((onDone, onError) =>
			readArtifactMarkdown(artifactId, onDone, onError),
		);
	}, [artifactId]);

	// why: the shell titles the window before the page has said anything, so
	// the Artifact names its own window as soon as it knows its name.
	useEffect(() => {
		if (state._tag === "done") {
			document.title = state.value.title;
		}
	}, [state]);

	return (
		<main style={windowStyle}>
			{state._tag === "failed" ? (
				<span style={{ color: "#ff7c7c" }}>{state.message}</span>
			) : null}
			{state._tag === "done" ? (
				<OutcomeMarkdownView markdown={state.value.markdown} />
			) : null}
			{state._tag === "done" || state._tag === "failed" ? null : (
				<span style={mutedStyle}>reading Artifact…</span>
			)}
		</main>
	);
};
