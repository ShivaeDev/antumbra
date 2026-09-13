import { SWITCH_KEYS } from "@antumbra/domain-settings/ids.ts";
import { allows, type FlagReading } from "@antumbra/domain-settings/queries/flags.ts";
import { useReading } from "@antumbra/glass-client/live.tsx";
import type { SettingsApi } from "@antumbra/glass-settings/glass.ts";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Cause, Effect } from "effect";
import { type ReactNode, useEffect, useState } from "react";
import { NavRail } from "#navigation/nav-rail.tsx";
import type { Shell } from "#shell.ts";

const NOTHING: readonly (typeof FlagReading.Type)[] = [];

export const Navigation = (props: {
	readonly api: SettingsApi;
	readonly shell: Shell;
	readonly place: ConsolePlace;
	readonly onError: (message: string) => void;
	readonly children: (place: ConsolePlace, onPlace: (place: ConsolePlace) => void, foldToolCalls: boolean) => ReactNode;
}) => {
	const [place, setPlace] = useState(props.place);
	const flags = useReading(props.api.settings.flags, {}) ?? NOTHING;
	const held = SWITCH_KEYS.some((key) => !allows(flags, key));
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
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">{props.children(place, setPlace, foldToolCalls)}</main>
		</div>
	);
};
