import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { CaptainLine } from "#captain.tsx";
import { Crew } from "#crew.tsx";

const REEF = Request.make("voyage:reef");
const HAIL = Request.make("agent:captain");
const SOUNDINGS = Request.make("piece:soundings");
const HAND = Request.make("agent:soundings");

const voyageId = VoyageId.make(REEF);

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
	yield* api.agents.hail({ requestId: HAIL, voyageId, by: "admiral" });
});

const manned = Effect.fnUntraced(function* (api: Api) {
	yield* crewed(api);
	yield* api.pieces.charter({
		requestId: SOUNDINGS,
		voyageId,
		title: "Soundings",
		charter: "sound the reef",
		expectation: "Soundings is landed",
		role: "hand",
		dependsOn: [],
	});
	const chartered = yield* eventually(api.pieces.byVoyage({ voyageId }), (rows) => rows.length === 1, "the chartered piece to reach the board");
	const piece = chartered[0] ?? expect.fail("the chartered piece");
	yield* api.agents.workNow({ requestId: HAND, pieceId: piece.id });
});

it.glass("opens the captain from the line that names the captain", function* ({ api, render }) {
	yield* crewed(api);
	let opened = "";
	const container = yield* render(
		<CaptainLine
			api={api}
			onAgent={(agentId) => {
				opened = agentId;
			}}
			voyageId={voyageId}
		/>,
	);
	const opening = `Open the captain ${identity(HAIL).agentId}`;
	yield* until(() => container.querySelector(`[aria-label="${opening}"]`) !== null, "the captain line to name its agent");
	yield* click(labelled(container, opening));
	expect(opened).toBe(identity(HAIL).agentId);
});

it.glass("opens a member of the crew from its own row and leaves the captain out of the crew", function* ({ api, render }) {
	yield* manned(api);
	let opened = "";
	const container = yield* render(
		<Crew
			api={api}
			onAgent={(agentId) => {
				opened = agentId;
			}}
			voyageId={voyageId}
		/>,
	);
	const opening = `Open hand ${identity(HAND).agentId}`;
	yield* until(() => container.querySelector(`[aria-label="${opening}"]`) !== null, "the crew row to reach the list");
	expect(container.querySelector(`[aria-label="Open captain ${identity(HAIL).agentId}"]`)).toBeNull();
	expect(container.querySelector("h2")?.nextElementSibling?.textContent).toBe("1");
	yield* click(labelled(container, opening));
	expect(opened).toBe(identity(HAND).agentId);
});
