import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { HoldsPanel } from "#holds.tsx";

const opening = {
	requestId: Id.Request.make("voyage"),
	name: "Reef",
	context: "Sound the reef",
	northStar: "Safe passage",
	kind: "voyage",
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
} as const;

const chartering = {
	requestId: Id.Request.make("piece"),
	voyageId: VoyageId.make("voyage"),
	title: "Sound",
	charter: "Sound the passage",
	expectation: "Chart",
	role: "hand",
	dependsOn: [],
} as const;

const switchOf = (container: HTMLElement, title: string): HTMLElement | null => container.querySelector(`[role="switch"][aria-label="${title}"]`);

const reads = (container: HTMLElement, title: string): string | null | undefined => switchOf(container, title)?.getAttribute("aria-checked");

it.glass("says nothing is waiting and persists the global hold through the switch", function* ({ api, render }) {
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => switchOf(container, "All queues") !== null, "the hold switches");
	expect(container.textContent).toContain("Nothing is waiting on a switch.");
	yield* click(labelled(container, "All queues"));
	yield* eventually(api.holds.queues({}), (view) => view.everything, "the global hold to take effect");
	yield* until(() => reads(container, "All queues") === "false", "the hold to persist");
});

it.glass("lists what a held switch is keeping back and sends again when it goes back on", function* ({ api, render }) {
	yield* api.voyages.open(opening);
	yield* api.pieces.charter(chartering);
	yield* api.pieces.launch({ id: PieceId.make("piece") });
	yield* api.settings.setFlag({ key: "spawnForPiece", on: false });
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => switchOf(container, "Spawn an agent for a launched piece") !== null, "the held queue");
	expect(container.textContent).toContain("A launched piece with no living agent gets one.");
	expect(container.textContent).toContain("Sound");
	expect(container.textContent).toContain("Reef");
	expect(reads(container, "Spawn an agent for a launched piece")).toBe("false");
	yield* click(labelled(container, "Spawn an agent for a launched piece"));
	yield* eventually(
		api.settings.flags({}),
		(flags) => flags.some((setting) => setting.key === "spawnForPiece" && setting.on),
		"the piece-spawn switch to switch on",
	);
});

it.glass("keeps a held switch on the page before anything is waiting", function* ({ api, render }) {
	yield* api.settings.setFlag({ key: "spawnSmoother", on: false });
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => switchOf(container, "Spawn a smoother") !== null, "the held section");
	expect(container.textContent).toContain("0 waiting");
	expect(container.textContent).toContain("Nothing is waiting yet.");
});

it.glass("keeps its switches and takes no touch while the server is away", function* ({ api, render, server }) {
	yield* api.settings.setFlag({ key: "spawnSmoother", on: false });
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => switchOf(container, "Spawn a smoother") !== null, "the hold switches");

	yield* server.away;
	yield* until(() => container.querySelector('[aria-busy="true"]') !== null, "the panel to hold the reading it has");
	expect(container.querySelector("[inert]")?.contains(switchOf(container, "Spawn a smoother"))).toBe(true);
	expect(reads(container, "Spawn a smoother")).toBe("false");
	expect(reads(container, "All queues")).toBe("true");

	yield* server.back;
	yield* until(() => container.querySelector('[aria-busy="true"]') === null, "the panel to take the reading again");
	expect(reads(container, "Spawn a smoother")).toBe("false");
});
