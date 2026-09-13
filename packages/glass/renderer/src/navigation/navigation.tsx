import { SWITCH_KEYS } from "@antumbra/domain-settings/ids.ts";
import { allows } from "@antumbra/domain-settings/queries/flags.ts";
import { useLive } from "@antumbra/glass-client/hooks.ts";
import type { SettingsApi } from "@antumbra/glass-settings/glass.ts";
import type { VoyagesApi } from "@antumbra/glass-voyages/glass.ts";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Cause, Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { type ReactNode, useEffect, useState } from "react";
import { openedVoyages, rememberOpenedVoyage } from "#adapters/opened-voyages.ts";
import { NavRail } from "#navigation/nav-rail.tsx";
import type { Shell } from "#shell.ts";

export const Navigation = (props: {
	readonly api: SettingsApi & VoyagesApi;
	readonly shell: Shell;
	readonly place: ConsolePlace;
	readonly onError: (message: string) => void;
	readonly children: (place: ConsolePlace, onPlace: (place: ConsolePlace) => void, foldToolCalls: boolean) => ReactNode;
}) => {
	const [place, setPlace] = useState(props.place);
	const [recent, setRecent] = useState(openedVoyages);
	const settings = useLive(props.api.settings.flags, {});
	const flags = AsyncResult.isSuccess(settings) ? settings.value : [];
	const held = SWITCH_KEYS.some((key) => !allows(flags, key));
	const foldToolCalls = flags.some((flag) => flag.key === "foldToolCalls" && flag.on);
	const voyageId = place.mode === "voyages" ? place.voyageId : null;
	useEffect(() => {
		if (voyageId !== null) setRecent(rememberOpenedVoyage(voyageId));
	}, [voyageId]);
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
			<NavRail
				api={props.api}
				held={held}
				mode={place.mode}
				onMode={(mode) => setPlace(mode === "voyages" ? { ...place, mode, pieceId: null, voyageId: null } : { ...place, mode })}
				onVoyage={(opened) => setPlace({ ...place, mode: "voyages", pieceId: null, voyageId: opened })}
				recent={recent}
				shell={props.shell}
			/>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">{props.children(place, setPlace, foldToolCalls)}</main>
		</div>
	);
};
