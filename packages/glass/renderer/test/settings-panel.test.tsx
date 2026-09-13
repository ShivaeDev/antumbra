import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { Navigation } from "#navigation/navigation.tsx";
import { SettingsPanel } from "#settings/settings.tsx";
import type { Shell } from "#shell.ts";

const HELD = '[aria-busy="true"]';

const RECONNECTING = "Reconnecting to the server…";

const place: ConsolePlace = { role: "console", mode: "settings", changeId: null, pieceId: null, sessionId: null, voyageId: null };

const shell = (restartServer: Effect.Effect<void>): Shell => ({
	place: Effect.succeed(place),
	info: Effect.succeed({ productVersion: "1", chromeVersion: "1", electronVersion: "1", nodeVersion: "1" }),
	remember: () => Effect.void,
	open: () => Effect.void,
	restart: Effect.void,
	restartServer,
	openExternal: () => undefined,
});

const screen = (api: Api, host: Shell): ReactNode => (
	<Navigation api={api} onError={() => undefined} place={place} shell={host}>
		{() => <SettingsPanel api={api} onError={() => undefined} rebuildProjections={Effect.void} shell={host} />}
	</Navigation>
);

const said = (container: HTMLElement): readonly string[] =>
	[...container.querySelectorAll('[role="status"]')].map((element) => element.textContent ?? "");

const read = (container: HTMLElement) =>
	container.textContent?.includes("Maximum running agents") === true && container.textContent.includes("Flagship");

it.glass("keeps the settings it last read while the server is away, and takes them back", function* ({ api, render, server }) {
	const container = yield* render(screen(api, shell(Effect.void)));
	yield* until(() => read(container), "the settings to read");
	const row = container.querySelector("form");

	yield* server.away;

	yield* until(() => container.querySelector(HELD) !== null, "the settings to be held");
	expect(container.contains(row)).toBe(true);
	expect(read(container)).toBe(true);
	const held = container.querySelector(HELD);
	expect(held?.className).toContain("opacity-60");
	expect(held?.hasAttribute("inert")).toBe(true);
	expect(said(container)).toEqual([RECONNECTING]);

	yield* server.back;

	yield* until(() => container.querySelector(HELD) === null, "the settings to come back");
	expect(said(container)).toEqual([""]);
	expect(container.contains(row)).toBe(true);
	expect(read(container)).toBe(true);
});

it.glass("leaves both restart rows pressable while the server is away", function* ({ api, render, server }) {
	let servers = 0;
	const container = yield* render(
		screen(
			api,
			shell(
				Effect.sync(() => {
					servers += 1;
				}),
			),
		),
	);
	yield* until(() => read(container), "the settings to read");

	yield* server.away;

	yield* until(() => container.querySelector(HELD) !== null, "the settings to be held");
	const restartServer = labelled<HTMLButtonElement>(container, "Restart the server");
	const restartApp = labelled<HTMLButtonElement>(container, "Restart Antumbra");
	expect(container.querySelector(HELD)?.contains(restartServer)).toBe(false);
	expect(restartServer.disabled).toBe(false);
	expect(restartApp.disabled).toBe(false);

	yield* click(restartServer);

	yield* until(() => servers === 1, "the server restart request");
});

it.glass("says it is reconnecting in the body when the server was away before the first reading", function* ({ api, render, server }) {
	yield* server.away;

	const container = yield* render(screen(api, shell(Effect.void)));

	yield* until(() => container.querySelector("section")?.textContent?.includes(RECONNECTING) === true, "the reading to say it is reconnecting");
	expect(container.querySelector(HELD)).toBeNull();
	expect(read(container)).toBe(false);
});
