import { click, labelled, renderedControl, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { connectRunner } from "@antumbra/app-testing/runner.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { expect } from "vitest";
import { AgentSession } from "#agent-session.tsx";
import { FleetPanel } from "#fleet.tsx";
import { PieceSession } from "#piece-session.tsx";
import { SessionHeader } from "#session-header.tsx";
import { CREW, charted, openGroup, pieceId, VOYAGE_NAME, voyageId } from "#test/kit.ts";

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

	yield* until(() => container.querySelector(`[aria-label="Open voyage ${VOYAGE_NAME}"]`) !== null, "the voyage breadcrumb to name its voyage");
	yield* click(labelled(container, `Open voyage ${VOYAGE_NAME}`));
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

it.glass("an agent with no open conversation cannot be opened from its card", function* ({ api, render }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	const container = yield* render(<FleetPanel api={api} onSession={() => undefined} onPiece={() => undefined} onVoyage={() => undefined} />);
	yield* until(() => container.querySelector('[aria-label="Open hand"]') !== null, "the agent to reach the roster");
	yield* api.agents.retire({ id: identity(CREW).agentId });
	yield* openGroup(container, "Retired");
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
		<SessionHeader
			api={api}
			nodeId={node}
			onPopOut={(sessionId: string) => {
				popped = sessionId;
			}}
			sessionId={root}
			snapshot={undefined}
		/>,
	);
	yield* click(labelled(container, "Open in a tab"));
	expect(popped).toBe(node);
});

it.glass("a session row offers the tab its tooltip names", function* ({ api, render, run }) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
	const ids = identity(CREW);
	const runner = yield* run(connectRunner({ runnerId: "runner:fleet", logId: "log:fleet", backends: ["claude"], imageInputBackends: [] }));
	yield* run(
		runner.append([
			{
				logId: "log:fleet",
				cursor: 1,
				at: 0,
				event: {
					type: "SessionStarted",
					requestId: "start:fleet",
					sessionId: ids.sessionId,
					agentId: ids.agentId,
					backend: "claude",
					nativeRef: "native:fleet",
					cwd: "/fleet",
					toolSetVersion: "1",
					runnerId: "runner:fleet",
				},
			},
		]),
	);
	let popped: string | undefined;
	const container = yield* render(
		<FleetPanel
			api={api}
			onOpenTranscript={(id) => {
				popped = id;
			}}
			onPiece={() => undefined}
			onSession={() => undefined}
			onVoyage={() => undefined}
		/>,
	);
	yield* renderedControl(container, "Open in a tab");
	yield* click(labelled(container, "Open in a tab"));
	expect(popped).toBe(ids.sessionId);
});
