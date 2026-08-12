import type { AppInfo } from "@antumbra/contract";
import { Effect, Fiber } from "effect";
import { useEffect, useState } from "react";
import { type AppInfoLoadError, loadAppInfo } from "./adapters/trpc.js";

type Sight =
	| { readonly state: "charted"; readonly info: AppInfo }
	| { readonly state: "lost"; readonly message: string }
	| { readonly state: "sighting" };

const rows = (info: AppInfo): ReadonlyArray<readonly [string, string]> => [
	["Antumbra", info.productVersion],
	["Electron", info.electronVersion],
	["Chromium", info.chromeVersion],
	["Node", info.nodeVersion],
];

export const App = () => {
	const [sight, setSight] = useState<Sight>({ state: "sighting" });

	useEffect(() => {
		const program = loadAppInfo.pipe(
			Effect.tap((info) =>
				Effect.sync(() => setSight({ info, state: "charted" })),
			),
			Effect.catchTag("AppInfoLoadError", (error: AppInfoLoadError) =>
				Effect.sync(() => setSight({ message: error.message, state: "lost" })),
			),
		);
		const fiber = Effect.runFork(program);
		return () => {
			Effect.runFork(Fiber.interrupt(fiber));
		};
	}, []);

	return (
		<main
			style={{
				fontFamily: "system-ui",
				margin: "4rem auto",
				maxWidth: "28rem",
			}}
		>
			<h1>Antumbra</h1>
			{sight.state === "sighting" ? <p>Taking a sight…</p> : null}
			{sight.state === "lost" ? <p>Fix lost: {sight.message}</p> : null}
			{sight.state === "charted" ? (
				<dl>
					{rows(sight.info).map(([label, value]) => (
						<div key={label} style={{ display: "flex", gap: "1rem" }}>
							<dt style={{ minWidth: "8rem" }}>{label}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			) : null}
		</main>
	);
};
