import { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { ArtifactWindow } from "@antumbra/glass-artifacts/artifact-window.tsx";
import { useLive } from "@antumbra/glass-client/hooks.ts";
import { ExternalLinkContext } from "@antumbra/glass-components/external-link.tsx";
import { TooltipProvider } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { TranscriptView } from "@antumbra/glass-sessions/transcript.tsx";
import type { WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useState } from "react";
import { ConsoleApp } from "#app.tsx";
import type { RendererProps } from "#props.ts";

const Notice = ({ words }: { readonly words: string }) => (
	<main className="flex h-screen items-center justify-center bg-background text-xs text-muted-foreground">{words}</main>
);

const TranscriptWindow = (props: RendererProps & { readonly sessionId: string }) => {
	const settings = useLive(props.api.settings.flags, {});
	const foldToolCalls = AsyncResult.isSuccess(settings) && settings.value.some((flag) => flag.key === "foldToolCalls" && flag.on);
	return (
		<main className="flex h-screen min-w-0 flex-col bg-background text-foreground">
			<TranscriptView api={props.api} sessions={props.sessions} inputs={props.inputs} sessionId={props.sessionId} foldToolCalls={foldToolCalls} />
		</main>
	);
};

export const PlacedSurface = (props: RendererProps & { readonly place: WindowPlace | undefined }) => {
	if (props.place === undefined) return <Notice words="this window has no place" />;
	if (props.place.role === "console") return <ConsoleApp {...props} place={props.place} />;
	if (props.place.role === "artifact") return <ArtifactWindow artifactId={ArtifactId.make(props.place.artifactId)} read={props.readArtifact} />;
	return <TranscriptWindow {...props} sessionId={props.place.sessionId} />;
};

export const Surface = (props: RendererProps) => {
	const [place] = useState(() => Atom.make(props.shell.place));
	const located = useAtomValue(place);
	return (
		<ExternalLinkContext value={props.shell.openExternal}>
			<TooltipProvider delayDuration={300}>
				{AsyncResult.match(located, {
					onInitial: () => <Notice words="taking a sight…" />,
					onFailure: () => <PlacedSurface {...props} place={undefined} />,
					onSuccess: ({ value }) => <PlacedSurface {...props} place={value} />,
				})}
			</TooltipProvider>
		</ExternalLinkContext>
	);
};
