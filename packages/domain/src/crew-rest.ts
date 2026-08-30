import { sessionAtRest, sessionRetirable } from "@antumbra/sessions";
import { sessionPresence } from "@antumbra/vocabulary/agent-runtime";
import type { PieceView } from "#piece-view.ts";
import type { AgentSessionRow, VoyageWorld } from "#voyage-rows.ts";

// why: what this process is holding and what those holdings are carrying. The
// world it is read beside is rows only, so the two facts a row cannot know
// arrive together and once — a crew judged against a snapshot half of which is
// a moment older would be a crew judged against a moment that never existed.
export interface CrewRuntime {
	readonly attached: ReadonlySet<string>;
	readonly delegating: ReadonlySet<string>;
}

const openRootsOf = (
	world: VoyageWorld,
	agentId: string,
): ReadonlyArray<AgentSessionRow> =>
	world.sessions.filter(
		(session) => session.agentId === agentId && session.status === "open",
	);

const restful = (runtime: CrewRuntime, session: AgentSessionRow): boolean =>
	sessionAtRest({
		delegating: runtime.delegating.has(session.id),
		presence: sessionPresence({
			attached: runtime.attached.has(session.id),
			executionStatus: session.executionStatus,
			open: true,
		}),
	});

const working = (runtime: CrewRuntime, session: AgentSessionRow): boolean =>
	!sessionRetirable(
		sessionPresence({
			attached: runtime.attached.has(session.id),
			executionStatus: session.executionStatus,
			open: true,
		}),
	);

// why: an Agent rests when every open Session it answers through rests, and
// the sessions it rested in are carried out beside it because the clock has a
// second question to ask of exactly those — how long. An Agent with no open
// Session is left out rather than counted quiet: nothing is listening to it,
// so its silence is an absence of news, not news.
export const restingCrew = (
	world: VoyageWorld,
	runtime: CrewRuntime,
): ReadonlyMap<string, ReadonlyArray<string>> =>
	new Map(
		[...world.agentStatus].flatMap(([agentId, status]) => {
			const roots = openRootsOf(world, agentId);
			return status === "alive" &&
				roots.length > 0 &&
				roots.every((session) => restful(runtime, session))
				? [[agentId, roots.map((session) => session.id)] as const]
				: [];
		}),
	);

// why: the weaker reading, for the crew of a piece the admiral has written
// off. It is the guard's own rule rather than rest, said here so eligibility
// and execution ask the same question — a pass that proposed what the guard
// refuses would resubmit on every tick, because only an Intent still in flight
// is deduplicated and a refused one is not.
export const retirableCrew = (
	world: VoyageWorld,
	runtime: CrewRuntime,
): ReadonlySet<string> =>
	new Set(
		[...world.agentStatus].flatMap(([agentId, status]) =>
			status === "alive" &&
			openRootsOf(world, agentId).every((session) => !working(runtime, session))
				? [agentId]
				: [],
		),
	);

// why: the button's own eligibility, said here beside the rule it stands on.
// A crew is the agents still sailing — one already retired belongs to the
// piece's history rather than to what is left to release — and a landed piece
// nobody still claims has nothing to release at all.
export const crewReleasable = (
	piece: PieceView,
	resting: ReadonlyMap<string, ReadonlyArray<string>>,
): boolean => {
	const crew = piece.agents.filter((agent) => agent.status === "alive");
	return (
		piece.state === "done" &&
		crew.length > 0 &&
		crew.every((agent) => resting.has(agent.agentId))
	);
};

// why: a piece's crew is the claims staked on it when its agents were born,
// never the role its charter was written for. A captain is claimed to no
// piece, so selecting by the claim row is what keeps a voyage's own agent out
// of every piece's crew by construction rather than by spelling.
export const claimedCrew = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<string> =>
	world.assignments
		.filter((assignment) => assignment.pieceId === pieceId)
		.map((assignment) => assignment.agentId);
