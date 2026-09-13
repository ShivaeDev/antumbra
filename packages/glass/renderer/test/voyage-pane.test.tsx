import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { VoyagesPage } from "#navigation/voyages.tsx";
import type { Shell } from "#shell.ts";

const REEF = Request.make("voyage:reef");
const SOUNDINGS = Request.make("piece:soundings");
const HAND = Request.make("agent:soundings");
const CAPTAIN = Request.make("agent:captain");

const voyageId = VoyageId.make(REEF);
const pieceId = PieceId.make(SOUNDINGS);

const crewed = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open({
		requestId: REEF,
		kind: "voyage",
		name: "Chart the reef",
		northStar: "every shoal is known",
		context: "",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	yield* api.pieces.charter({
		requestId: SOUNDINGS,
		voyageId,
		title: "Soundings",
		charter: "sound the reef",
		expectation: "Soundings is landed",
		role: "hand",
		dependsOn: [],
	});
	yield* api.agents.workNow({ requestId: HAND, pieceId });
	yield* api.agents.hail({ requestId: CAPTAIN, voyageId, by: "admiral" });
	return yield* eventually(api.agents.roster({}), (agents) => agents.length === 2, "both agents to reach the roster");
});

const shell: Shell = {
	place: Effect.succeed({ role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId }),
	info: Effect.succeed({ productVersion: "1", chromeVersion: "1", electronVersion: "1", nodeVersion: "1" }),
	remember: () => Effect.void,
	open: () => Effect.void,
	restart: Effect.void,
	restartServer: Effect.void,
	openExternal: () => undefined,
};

const screen = (api: Api, place: ConsolePlace, onPlace: (next: ConsolePlace) => void): ReactNode => (
	<VoyagesPage
		api={api}
		onError={(message) => Effect.runSync(Effect.die(message))}
		onPlace={onPlace}
		place={place}
		readArtifact={() => Effect.die("no artifact in this test")}
		renderSession={(sessionId) => <output>{sessionId}</output>}
		shell={shell}
	/>
);

const opened: ConsolePlace = { role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId };

it.glass("gives a picked voyage the whole width until something is opened beside it", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(screen(api, opened, () => undefined));
	yield* until(() => container.textContent?.includes("Soundings") === true, "the voyage's pieces to reach the detail");
	expect(container.querySelector("output")).toBeNull();
	expect(container.querySelector('[aria-label="Resize the session"]')).toBeNull();
});

it.glass("a piece and a member of the crew take turns in the pane", function* ({ api, render }) {
	const crew = yield* crewed(api);
	const hand = crew.find((agent) => agent.role === "hand");
	const captain = crew.find((agent) => agent.role === "captain");
	if (hand === undefined || captain === undefined) return expect.fail("the voyage's crew");
	let place: ConsolePlace = opened;
	const remember = (next: ConsolePlace) => {
		place = next;
	};
	const container = yield* render(screen(api, place, remember));
	const crewRow = `Open captain ${captain.id}`;
	yield* until(() => container.querySelector(`[aria-label="${crewRow}"]`) !== null, "the captain's row in the crew list");
	yield* click(labelled(container, crewRow));
	yield* until(() => container.querySelector("output")?.textContent === captain.currentSessionId, "the captain's conversation in the pane");
	expect(place.pieceId).toBeNull();

	yield* click(labelled(container, "Open Soundings"));
	expect(place.pieceId).toBe(pieceId);
	yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector("output")?.textContent === hand.currentSessionId, "the piece's conversation in the pane");

	yield* click(labelled(container, crewRow));
	expect(place.pieceId).toBeNull();
	yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector("output")?.textContent === captain.currentSessionId, "the captain's conversation again");
});
