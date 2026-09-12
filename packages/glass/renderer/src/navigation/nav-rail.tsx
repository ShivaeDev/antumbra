import { reading } from "@antumbra/glass-client/live.tsx";
import type { ConsoleMode } from "@antumbra/platform-shell/windows.ts";
import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/unstable/reactivity";
import { useState } from "react";
import { ModeNav } from "#navigation/mode-nav.tsx";
import type { Shell } from "#shell.ts";

export const NavRail = (props: {
	readonly shell: Shell;
	readonly held: boolean;
	readonly mode: ConsoleMode;
	readonly onMode: (mode: ConsoleMode) => void;
}) => {
	const [info] = useState(() => Atom.make(props.shell.info));
	return (
		<div className="flex w-44 shrink-0 flex-col gap-4 border-r border-border bg-card px-2 py-3">
			<header className="flex flex-col px-2">
				<h1 className="text-sm font-medium">Antumbra</h1>
				<span className="text-2xs text-muted-foreground">
					{reading(useAtomValue(info), "taking a sight…", (value) => `v${value.productVersion}`)}
				</span>
			</header>
			<ModeNav held={props.held} mode={props.mode} onMode={props.onMode} />
		</div>
	);
};
