import { RulingFailure, type StandingRulingsView } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Voyages } from "@antumbra/voyages";
import { Effect, Option } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { membershipsOf, piecesByIds, piecesOfVoyages } from "#piece-reading.ts";
import { namedIds, type RulingNames } from "#ruling-names.ts";
import { standingRulingSeen } from "#ruling-projection.ts";
import { rulingStaleness } from "#ruling-staleness.ts";
import { byId } from "#voyage-row-projection.ts";

const standingSeen = (world: RulingNames, ruling: Ruling, stale: boolean): Effect.Effect<StandingRulingsView["rulings"][number], RulingFailure> =>
	Option.match(ruling.answer, {
		onNone: () => new RulingFailure({ message: `ruling ${ruling.id} stands without an answer` }),
		onSome: (answer) => Effect.succeed(standingRulingSeen(world, ruling, answer, stale)),
	});

export const standing = Effect.fn("RulingDisplay.standing")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const sailing = yield* Voyages;
	const ruled = yield* rulings.standing([]);
	const named = namedIds(ruled);
	const voyageIds = new Set(named.voyages);
	const berthed = yield* piecesOfVoyages(named.voyages);
	const memberships = membershipsOf(berthed);
	const pieceIds = [...named.pieces, ...berthed.map((piece) => piece.id)];
	const pieces = yield* piecesByIds(pieceIds);
	const assignments = yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all();
	const working = yield* db.Agent.where((agent) => agent.id.in(assignments.map((assignment) => assignment.agentId)))
		.where((agent) => agent.status.in(["alive", "spawning"]))
		.all();
	const world = {
		agents: byId(yield* db.Agent.where((agent) => agent.id.in(named.agents)).all()),
		pieces: byId(pieces),
		repos: byId(yield* db.Repo.where((repo) => repo.id.in(named.repos)).all()),
		voyages: byId((yield* sailing.list()).filter((voyage) => voyageIds.has(voyage.id))),
	};
	const stale = rulingStaleness({
		...(yield* readAgentExecution(working)),
		...(yield* readOutcomes(pieceIds)),
		assignments,
		memberships,
		pieces,
	});
	return { rulings: yield* Effect.forEach(ruled, (ruling) => standingSeen(world, ruling, stale(ruling))) };
});
