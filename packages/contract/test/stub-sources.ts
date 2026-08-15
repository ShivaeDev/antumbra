import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import {
	AppInfoSource,
	type PieceView,
	type SessionEvent,
	SightFailure,
	SightSource,
	VoyageSource,
	type VoyageSummary,
	type VoyageView,
} from "#index.ts";

export const info = {
	chromeVersion: "138.0.0.0",
	electronVersion: "43.3.0",
	nodeVersion: "22.21.0",
	productVersion: "0.0.0",
};

export const fleet = {
	agents: [
		{
			berths: [{ branch: "work/agent-1/reef", slug: "reef", status: "ready" }],
			charter: "chart the reef",
			id: "agent-1",
			role: "navigator",
			sessions: [
				{
					backend: "claude",
					cwd: "/tmp/reef",
					id: "session-1",
					status: "open",
				},
			],
			status: "alive",
		},
	],
	backends: ["claude"],
	repos: [
		{ defaultRef: "main", id: "repo-1", name: "shoals", source: "/tmp/shoals" },
	],
};

export const storedEvents: ReadonlyArray<SessionEvent> = [
	{ kind: "system/init", payload: "{}", seq: 0, sessionId: "session-1" },
	{ kind: "assistant", payload: "{}", seq: 1, sessionId: "session-1" },
];

const soundings: PieceView = {
	agents: [{ agentId: "agent-2", status: "alive" }],
	artifacts: [],
	changes: [],
	charter: "sound the northern shoals",
	dependsOn: [],
	expectation: "the depths are recorded",
	id: "piece-1",
	launchedAt: "2026-08-15T09:05:00.000Z",
	parkedAt: null,
	reports: [],
	role: "hand",
	state: "active",
	title: "soundings",
};

const chart: PieceView = {
	agents: [],
	artifacts: [],
	changes: [],
	charter: "draw the chart from the soundings",
	dependsOn: ["piece-1"],
	expectation: "a chart exists",
	id: "piece-2",
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "cartographer",
	state: "held",
	title: "the chart",
};

export const reefSummary: VoyageSummary = {
	backend: "claude",
	captain: { agentId: "agent-1", status: "alive" },
	counts: { active: 1, done: 0, pieces: 2, ready: 0 },
	focusedAt: "2026-08-15T09:00:00.000Z",
	id: "voyage-1",
	name: "Chart the reef",
	northStar: "every shoal is known",
	state: "underWay",
};

export const reefView: VoyageView = {
	...reefSummary,
	board: [
		{
			authorAgentId: null,
			body: "the reef shifts after a storm",
			createdAt: "2026-08-15T09:10:00.000Z",
			id: "entry-1",
			register: "smooth",
		},
	],
	context: "the reef is uncharted",
	crew: [{ agentId: "agent-1", role: "captain", status: "alive" }],
	pieces: [soundings, chart],
};

const noSuchVoyage = (voyageId: string) =>
	new SightFailure({ message: `no such voyage: ${voyageId}` });

const sightStub = Layer.succeed(SightSource, {
	fleet: Effect.succeed(fleet),
	fleetFeed: Stream.make(fleet),
	forgetRepo: () => Effect.void,
	interrupt: (sessionId) =>
		new SightFailure({ message: `session not live: ${sessionId}` }),
	registerRepo: (registration) =>
		Effect.succeed({
			defaultRef: registration.defaultRef,
			id: "repo-new",
			name: "shallows",
			source: registration.source,
		}),
	retire: () => Effect.void,
	sessionEventFeed: (query) =>
		Stream.fromArray(
			storedEvents.filter((event) => event.seq >= query.fromSeq),
		),
	sessionEvents: (query) =>
		Effect.succeed(storedEvents.filter((event) => event.seq >= query.fromSeq)),
	spawn: (request) =>
		Effect.succeed({
			agentId: `agent-for-${request.role}`,
			sessionId: "session-new",
		}),
});

const voyageStub = Layer.succeed(VoyageSource, {
	charterPiece: (request) =>
		Effect.succeed({ pieceId: `piece-for-${request.title}` }),
	hail: () => Effect.succeed({ agentId: "agent-hailed" }),
	launch: () => Effect.void,
	open: (request) => Effect.succeed({ ...reefSummary, name: request.name }),
	park: () => Effect.void,
	rewire: () => Effect.void,
	setFocus: () => Effect.void,
	unpark: () => Effect.void,
	voyage: (voyageId) =>
		voyageId === reefView.id
			? Effect.succeed(reefView)
			: noSuchVoyage(voyageId),
	voyageFeed: (voyageId) =>
		voyageId === reefView.id
			? Stream.make(reefView)
			: Stream.fail(noSuchVoyage(voyageId)),
	voyages: Effect.succeed([reefSummary]),
	voyagesFeed: Stream.make([reefSummary]),
	writeBoard: () => Effect.void,
});

export const makeRuntime = () =>
	ManagedRuntime.make(
		Layer.mergeAll(
			Layer.succeed(AppInfoSource, { current: Effect.succeed(info) }),
			sightStub,
			voyageStub,
		),
	);
