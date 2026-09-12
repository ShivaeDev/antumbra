import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { ConsolePlace, WindowPlace } from "@antumbra/platform-shell/windows.ts";
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
	yield* api.settings.setFlag({ key: "holdWakes", on: true });
	yield* until(() => container.querySelector("nav")?.textContent?.includes("Holdsheld") === true, "the hold to reach navigation");
	yield* api.settings.setFlag({ key: "foldToolCalls", on: true });
	yield* until(() => container.querySelector("output")?.textContent === "quay:folded", "the fold setting to reach the current screen");
});
