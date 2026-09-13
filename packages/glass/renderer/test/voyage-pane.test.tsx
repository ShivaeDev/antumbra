import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
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
	yield* api.agents.hail({ requestId: CAPTAIN, voyageId });
	return yield* eventually(api.agents.roster({}), (agents) => agents.length === 2);
});

const shell: Shell = {
	place: Effect.succeed({ role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId }),
	info: Effect.succeed({ productVersion: "1", chromeVersion: "1", electronVersion: "1", nodeVersion: "1" }),
	remember: () => Effect.void,
	open: () => Effect.void,
	restart: Effect.void,
	openExternal: () => undefined,
};

it.glass("a piece and a member of the crew take turns in the pane", function* ({ api, render }) {
	const crew = yield* crewed(api);
	const hand = crew.find((agent) => agent.role === "hand");
	const captain = crew.find((agent) => agent.role === "captain");
	if (hand === undefined || captain === undefined) return expect.fail("the voyage's crew");
	let place: ConsolePlace = { role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId };
	const screen = () => (
		<VoyagesPage
			api={api}
			onError={(message) => Effect.runSync(Effect.die(message))}
			onPlace={(next) => {
				place = next;
			}}
			place={place}
			readArtifact={() => Effect.die("no artifact in this test")}
			renderSession={(sessionId) => <output>{sessionId}</output>}
			shell={shell}
		/>
	);
	const container = yield* render(screen());
	yield* until(() => container.textContent?.includes("Nothing open yet") === true, "the pane to say what a click will put there");

	const crewRow = `Open captain ${captain.id}`;
	yield* until(() => container.querySelector(`[aria-label="${crewRow}"]`) !== null, "the captain's row in the crew list");
	yield* click(labelled(container, crewRow));
	yield* until(() => container.querySelector("output")?.textContent === captain.currentSessionId, "the captain's conversation in the pane");
	expect(place.pieceId).toBeNull();

	yield* click(labelled(container, "Open Soundings"));
	expect(place.pieceId).toBe(pieceId);
	yield* render(screen());
	yield* until(() => container.querySelector("output")?.textContent === hand.currentSessionId, "the piece's conversation in the pane");

	yield* click(labelled(container, crewRow));
	expect(place.pieceId).toBeNull();
	yield* render(screen());
	yield* until(() => container.querySelector("output")?.textContent === captain.currentSessionId, "the captain's conversation again");
});
