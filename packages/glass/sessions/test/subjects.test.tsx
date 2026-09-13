import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { AgentSession } from "#agent-session.tsx";
import { FleetPanel } from "#fleet.tsx";
import { PaneHeader } from "#pane-header.tsx";
import { PieceSession } from "#piece-session.tsx";

const REEF = Request.make("voyage:reef");
const SOUNDINGS = Request.make("piece:soundings");
const CREW = Request.make("agent:soundings");
const SMOOTHER = Request.make("agent:smoothing");

const voyageId = VoyageId.make(REEF);
const pieceId = PieceId.make(SOUNDINGS);

const charted = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open({
		requestId: REEF,
		kind: "voyage",
		name: "Chart the reef",
		northStar: "every shoal is known",
		context: "the reef is uncharted",
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
});

const smoothing = Effect.fnUntraced(function* (api: Api) {
	const ids = identity(SMOOTHER);
	yield* api.agents.smooth({ requestId: SMOOTHER, agentId: ids.agentId, sessionId: ids.sessionId, voyageId, cwd: null });
});

const groupsOf = (container: HTMLElement): readonly (string | null | undefined)[] =>
	[...container.querySelectorAll("h2")].map((heading) => heading.parentElement?.textContent);

it.glass("an agent card opens that agent's session and leaves the fleet only through its voyage", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	let opened: string | undefined;
	let leaving: string | undefined;
	const container = yield* render(
		<FleetPanel
			api={api}
			onSession={(id) => {
				opened = id;
			}}
			onPiece={(voyage, piece) => {
				leaving = `${voyage}/${piece}`;
			}}
			onVoyage={(voyage) => {
				leaving = voyage;
			}}
		/>,
	);
	yield* until(() => container.querySelector('[aria-label="Open hand"]') !== null, "the agent to reach the roster");
	yield* click(labelled(container, "Open hand"));
	expect(opened).toBe(identity(CREW).sessionId);
	expect(leaving).toBeUndefined();
	expect(container.textContent).toContain("Soundings");

	yield* until(() => container.querySelector('[aria-label="Open voyage Chart the reef"]') !== null, "the voyage breadcrumb to name its voyage");
	yield* click(labelled(container, "Open voyage Chart the reef"));
	expect(leaving).toBe(`${voyageId}/${pieceId}`);
});

it.glass("a piece opens the session of the agent working it", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	const container = yield* render(<PieceSession api={api} pieceId={pieceId} renderSession={(id) => <output>{id}</output>} />);
	yield* until(() => container.querySelector("output") !== null, "the piece's session to reach the pane");
	expect(container.querySelector("output")?.textContent).toBe(identity(CREW).sessionId);
});

it.glass("a piece no agent has spoken for says so where its session would be", function* ({ api, render }) {
	yield* charted(api);
	const container = yield* render(<PieceSession api={api} pieceId={pieceId} renderSession={(id) => <output>{id}</output>} />);
	yield* until(
		() => container.textContent?.includes("No agent of this piece has a conversation yet") === true,
		"the pane to say the piece has no crew",
	);
	expect(container.querySelector("output")).toBeNull();
});

it.glass("the fleet keeps smoothers out of its groups until it is asked to show them", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	yield* smoothing(api);
	yield* eventually(api.agents.roster({}), (rows) => rows.length === 2);
	const container = yield* render(<FleetPanel api={api} onSession={() => undefined} onPiece={() => undefined} onVoyage={() => undefined} />);
	yield* until(() => container.querySelector('[aria-label="Open hand"]') !== null, "the agent to reach the roster");
	const withoutSmoothers = groupsOf(container);
	expect(withoutSmoothers).toEqual(["Preparing to work1"]);
	expect(container.querySelector('[aria-label="Open smoother"]')).toBeNull();

	yield* click(labelled(container, "Show smoothers"));
	yield* until(() => container.querySelector('[aria-label="Open smoother"]') !== null, "the smoother to join the roster");
	expect(groupsOf(container)).toEqual([...withoutSmoothers, "Smoothing1"]);
});

it.glass("a fleet of smoothers alone says so and offers them", function* ({ api, render }) {
	yield* charted(api);
	yield* smoothing(api);
	yield* eventually(api.agents.roster({}), (rows) => rows.length === 1);
	const container = yield* render(<FleetPanel api={api} onSession={() => undefined} onPiece={() => undefined} onVoyage={() => undefined} />);
	yield* until(
		() => container.textContent?.includes("Only smoothers are here. Show smoothers to see them.") === true,
		"the fleet to say only smoothers are here",
	);
	yield* click(labelled(container, "Show smoothers"));
	yield* until(() => container.querySelector('[aria-label="Open smoother"]') !== null, "the smoother to join the roster");
	expect(groupsOf(container)).toEqual(["Smoothing1"]);
	expect(container.textContent).not.toContain("Only smoothers are here");
});

it.glass("an agent with no open conversation cannot be opened from its card", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	const container = yield* render(<FleetPanel api={api} onSession={() => undefined} onPiece={() => undefined} onVoyage={() => undefined} />);
	yield* until(() => container.querySelector('[aria-label="Open hand"]') !== null, "the agent to reach the roster");
	yield* api.agents.retire({ id: identity(CREW).agentId });
	yield* until(() => container.querySelector('[aria-label="hand, retired"]') !== null, "the card to say the agent is retired");
	expect(labelled<HTMLButtonElement>(container, "hand, retired").disabled).toBe(true);
	expect(container.querySelector('[aria-label="Open hand"]')).toBeNull();
});

it.glass("an agent opens its own conversation, by its id alone", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	const container = yield* render(<AgentSession api={api} agentId={identity(CREW).agentId} renderSession={(id) => <output>{id}</output>} />);
	yield* until(() => container.querySelector("output") !== null, "the agent's conversation to reach the pane");
	expect(container.querySelector("output")?.textContent).toBe(identity(CREW).sessionId);
});

it.glass("the pane header pops out the conversation it is reading", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	const root = identity(CREW).sessionId;
	const node = `${root}:child`;
	let popped = "";
	const container = yield* render(
		<PaneHeader
			api={api}
			onPopOut={(sessionId) => {
				popped = sessionId;
			}}
			reading={node}
			sessionId={root}
		/>,
	);
	yield* click(labelled(container, "Open in a window"));
	expect(popped).toBe(node);
});
