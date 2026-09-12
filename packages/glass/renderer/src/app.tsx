import { ProviderCapacities } from "@antumbra/glass-capacity/capacity.tsx";
import { useLive } from "@antumbra/glass-client/hooks.ts";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Cause, Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { ConsoleMain } from "#navigation/console-main.tsx";
import { NavRail } from "#navigation/nav-rail.tsx";
import type { RendererProps } from "#props.ts";

export const ConsoleApp = (props: RendererProps & { readonly place: ConsolePlace; readonly onError: (message: string) => void }) => {
	const [place, setPlace] = useState(props.place);
	const settings = useLive(props.api.settings.flags, {});
	const flags = AsyncResult.isSuccess(settings) ? settings.value : [];
	const held = flags.some((flag) => flag.on && (flag.key === "holdEverything" || flag.key === "holdPieceDispatch" || flag.key === "holdWakes"));
	const foldToolCalls = flags.some((flag) => flag.key === "foldToolCalls" && flag.on);
	useEffect(
		() =>
			Effect.runCallback(props.shell.remember(place), {
				onExit: (exit) => {
					if (exit._tag === "Failure") props.onError(Cause.pretty(exit.cause));
				},
			}),
		[props.shell, props.onError, place],
	);
	return (
		<div className="flex h-screen min-w-0 bg-background text-foreground">
			<NavRail shell={props.shell} held={held} mode={place.mode} onMode={(mode) => setPlace({ ...place, mode })} />
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">
				<ProviderCapacities api={props.api} />
				<ConsoleMain {...props} place={place} onPlace={setPlace} foldToolCalls={foldToolCalls} />
			</main>
		</div>
	);
};
