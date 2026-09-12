import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { OutcomeMarkdownView } from "@antumbra/glass-components/outcome-markdown.tsx";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect } from "react";
import type { ReadArtifact } from "#glass.ts";
import { useArtifact } from "#read.ts";
import { readFailure } from "#read-failure.ts";
export const ArtifactWindow = (props: { readonly artifactId: ArtifactId; readonly read: ReadArtifact }) => {
	const result = useArtifact(props.read, props.artifactId);
	useEffect(() => {
		if (AsyncResult.isSuccess(result)) document.title = result.value.title;
	}, [result]);
	return (
		<main className="flex h-screen min-w-0 flex-col overflow-y-auto bg-background p-5 text-foreground">
			{AsyncResult.match(result, {
				onInitial: () => <span>Reading Artifact…</span>,
				onFailure: (failure) => <span role="alert">{readFailure(failure.cause)}</span>,
				onSuccess: ({ value }) => <OutcomeMarkdownView markdown={value.markdown} />,
			})}
		</main>
	);
};
