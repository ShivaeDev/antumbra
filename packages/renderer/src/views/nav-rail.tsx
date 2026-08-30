import type { ConsoleMode } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { loadAppInfo } from "#adapters/trpc.ts";
import { ModeNav } from "#views/mode-nav.tsx";

const appInfoAtom = Atom.make(loadAppInfo);

const Version = () => {
	const info = useAtomValue(appInfoAtom);
	return (
		<span className="text-2xs text-muted-foreground">
			{AsyncResult.matchWithError(info, {
				onDefect: () => "fix lost",
				onError: () => "fix lost",
				onInitial: () => "taking a sight…",
				onSuccess: (success) => `v${success.value.productVersion}`,
			})}
		</span>
	);
};

export const NavRail = ({ mode, onMode }: { readonly mode: ConsoleMode; readonly onMode: (mode: ConsoleMode) => void }) => (
	<div className="flex w-44 shrink-0 flex-col gap-4 border-r border-border bg-card px-2 py-3">
		<header className="flex flex-col px-2">
			<h1 className="text-sm font-medium">Antumbra</h1>
			<Version />
		</header>
		<ModeNav mode={mode} onMode={onMode} />
	</div>
);
