import type { AppInfo } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { loadAppInfo } from "./adapters/trpc.js";

const appInfoAtom = Atom.make(loadAppInfo);

const rows = (info: AppInfo): ReadonlyArray<readonly [string, string]> => [
	["Antumbra", info.productVersion],
	["Electron", info.electronVersion],
	["Chromium", info.chromeVersion],
	["Node", info.nodeVersion],
];

export const App = () => {
	const sight = useAtomValue(appInfoAtom);

	return (
		<main
			style={{
				fontFamily: "system-ui",
				margin: "4rem auto",
				maxWidth: "28rem",
			}}
		>
			<h1>Antumbra</h1>
			{AsyncResult.matchWithError(sight, {
				onDefect: (defect) => <p>Fix lost: {String(defect)}</p>,
				onError: (error) => <p>Fix lost: {error.message}</p>,
				onInitial: () => <p>Taking a sight…</p>,
				onSuccess: (success) => (
					<dl>
						{rows(success.value).map(([label, value]) => (
							<div key={label} style={{ display: "flex", gap: "1rem" }}>
								<dt style={{ minWidth: "8rem" }}>{label}</dt>
								<dd>{value}</dd>
							</div>
						))}
					</dl>
				),
			})}
		</main>
	);
};
