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

it.glass("says nothing is waiting and persists the global hold through the switch", function* ({ api, render }) {
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => container.querySelector('input[aria-label="All queues"]') !== null, "the hold switches");
	expect(container.textContent).toContain("Nothing is waiting on a switch.");
	yield* click(labelled(container, "All queues"));
	yield* eventually(api.holds.queues({}), (view) => view.everything, "the global hold to take effect");
	yield* until(() => !labelled<HTMLInputElement>(container, "All queues").checked, "the hold to persist");
});

it.glass("lists what a held switch is keeping back and sends again when it goes back on", function* ({ api, render }) {
	yield* api.voyages.open(opening);
	yield* api.pieces.charter(chartering);
	yield* api.pieces.launch({ id: PieceId.make("piece") });
	yield* api.settings.setFlag({ key: "spawnForPiece", on: false });
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => container.querySelector('input[aria-label="Spawn an agent for a launched piece"]') !== null, "the held queue");
	expect(container.textContent).toContain("A launched piece with no living agent gets one.");
	expect(container.textContent).toContain("Sound");
	expect(container.textContent).toContain("Reef");
	const control = labelled<HTMLInputElement>(container, "Spawn an agent for a launched piece");
	expect(control.checked).toBe(false);
	yield* click(control);
	yield* eventually(
		api.settings.flags({}),
		(flags) => flags.some((setting) => setting.key === "spawnForPiece" && setting.on),
		"the spawnForPiece flag to switch on",
	);
});

it.glass("keeps a held switch on the page before anything is waiting", function* ({ api, render }) {
	yield* api.settings.setFlag({ key: "spawnSmoother", on: false });
	const container = yield* render(<HoldsPanel api={api} />);
	yield* until(() => container.querySelector('input[aria-label="Spawn a smoother"]') !== null, "the held section");
	expect(container.textContent).toContain("0 waiting");
	expect(container.textContent).toContain("Nothing is waiting yet.");
});
