import { reading } from "@antumbra/glass-client/live.tsx";
import { Reconnecting } from "@antumbra/glass-client/reconnection.tsx";
import type { VoyagesApi } from "@antumbra/glass-voyages/glass.ts";
import type { ConsoleMode } from "@antumbra/platform-shell/windows.ts";
import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/unstable/reactivity";
import { useState } from "react";
import { ModeNav } from "#navigation/mode-nav.tsx";
import type { Shell } from "#shell.ts";

export const NavRail = (props: {
	readonly api: VoyagesApi;
	readonly shell: Shell;
	readonly held: boolean;
	readonly mode: ConsoleMode;
	readonly onMode: (mode: ConsoleMode) => void;
	readonly onVoyage: (voyageId: string) => void;
	readonly recent: readonly string[];
}) => {
	const [info] = useState(() => Atom.make(props.shell.info));
	return (
		<div className="flex w-44 shrink-0 flex-col gap-4 border-r border-border bg-card px-2 py-3">
			<header className="flex flex-col px-2">
				<h1 className="text-sm font-medium">Antumbra</h1>
				<div className="text-2xs text-muted-foreground">{reading(useAtomValue(info), "taking a sight…", (value) => `v${value.productVersion}`)}</div>
			</header>
			<ModeNav api={props.api} held={props.held} mode={props.mode} onMode={props.onMode} onVoyage={props.onVoyage} recent={props.recent} />
			<Reconnecting className="mt-auto px-2 text-xs text-muted-foreground" />
		</div>
	);
};
