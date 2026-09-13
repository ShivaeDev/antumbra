import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { ConsolePlace, WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { Navigation } from "#navigation/navigation.tsx";
import type { Shell } from "#shell.ts";

const place: ConsolePlace = { role: "console", mode: "fleet", changeId: null, pieceId: null, sessionId: null, voyageId: null };
const shell = (remember: (next: WindowPlace) => Effect.Effect<void>): Shell => ({
	place: Effect.succeed(place),
	info: Effect.succeed({ productVersion: "1", chromeVersion: "1", electronVersion: "1", nodeVersion: "1" }),
	remember,
	open: () => Effect.void,
	restart: Effect.void,
	restartServer: Effect.void,
	openExternal: () => undefined,
});

it.glass("remembers navigation through the shell and shows live holds on another page", function* ({ api, render }) {
	let saved: WindowPlace = place;
	const host = shell((next) =>
		Effect.sync(() => {
			saved = next;
		}),
	);
	const container = yield* render(
		<Navigation
			api={api}
			shell={host}
			place={place}
			onError={(message) => {
				Effect.runSync(Effect.die(message));
			}}
		>
			{(current, _select, folded) => (
				<output>
					{current.mode}:{folded ? "folded" : "open"}
				</output>
			)}
		</Navigation>,
	);
	yield* press(container, "Quay");
	yield* until(() => saved.role === "console" && saved.mode === "quay", "the shell to remember Quay");
	expect(container.querySelector("output")?.textContent).toBe("quay:open");
	yield* api.settings.setFlag({ key: "wakeOnRoutineMail", on: false });
	yield* until(() => container.querySelector("nav")?.textContent?.includes("Holdsheld") === true, "the hold to reach navigation");
	yield* api.settings.setFlag({ key: "foldToolCalls", on: true });
	yield* until(() => container.querySelector("output")?.textContent === "quay:folded", "the fold setting to reach the current screen");
});

const remembering = (): void => {
	const saved = new Map<string, string>();
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key: string) => saved.get(key) ?? null,
			setItem: (key: string, value: string) => {
				saved.set(key, value);
			},
		},
	});
};

const opening = (name: string) => ({
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage" as const,
	name,
	northStar: `${name} is known`,
	requestId: Request.make(`voyage:${name}`),
});

const NAMES = ["One", "Two", "Three", "Four", "Five", "Six"] as const;

it.glass("unfolds the last five voyages opened under the sidebar's Voyages item", function* ({ api, render }) {
	remembering();
	for (const name of NAMES) yield* api.voyages.open(opening(name));
	const voyages = yield* eventually(api.voyages.list({}), (rows) => rows.length === NAMES.length + 1, "every opened voyage to reach the list");
	const container = yield* render(
		<Navigation
			api={api}
			shell={shell(() => Effect.void)}
			place={place}
			onError={(message) => {
				Effect.runSync(Effect.die(message));
			}}
		>
			{(current, select) => (
				<output>
					{voyages.map((voyage) => (
						<button
							aria-label={`Go ${voyage.name}`}
							key={voyage.id}
							onClick={() => select({ ...current, mode: "voyages", voyageId: voyage.id })}
							type="button"
						/>
					))}
				</output>
			)}
		</Navigation>,
	);
	expect(container.querySelector('[aria-label="Voyages opened"]')).toBeNull();
	for (const name of NAMES) yield* click(labelled(container, `Go ${name}`));
	yield* click(labelled(container, "Voyages opened"));
	const rail = container.querySelector("nav") ?? expect.fail("the navigation rail");
	yield* until(() => rail.textContent?.includes("Six") === true, "the voyages opened to reach the rail");
	const listed = [...rail.querySelectorAll("button")].map((button) => button.textContent).filter((words) => NAMES.some((name) => words === name));
	expect(listed).toEqual(["Six", "Five", "Four", "Three", "Two"]);
});
