import type { WindowPlace } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { loadWindowPlace } from "#adapters/trpc-windows.ts";
import { ConsoleApp } from "#app.tsx";
import { ArtifactWindow } from "#views/artifact-window.tsx";
import { TranscriptWindow } from "#views/transcript-window.tsx";

const placeAtom = Atom.make(loadWindowPlace);

const Notice = ({ words }: { readonly words: string }) => (
	<main className="flex h-screen items-center justify-center bg-background text-xs text-muted-foreground">
		{words}
	</main>
);

// why: a window main cannot place is not a console. Falling back to the main
// view would hand a window powers over work it was never opened for, so it
// says what happened and shows nothing.
export const PlacedSurface = ({
	place,
}: {
	readonly place: WindowPlace | undefined;
}) => {
	if (place === undefined) {
		return <Notice words="this window has no place" />;
	}
	if (place.role === "console") {
		return <ConsoleApp place={place} />;
	}
	if (place.role === "artifact") {
		return <ArtifactWindow artifactId={place.artifactId} />;
	}
	return <TranscriptWindow sessionId={place.sessionId} />;
};

export const Surface = () => {
	const place = useAtomValue(placeAtom);
	return AsyncResult.matchWithError(place, {
		onDefect: () => <PlacedSurface place={undefined} />,
		onError: () => <PlacedSurface place={undefined} />,
		onInitial: () => <Notice words="taking a sight…" />,
		onSuccess: (success) => <PlacedSurface place={success.value} />,
	});
};
