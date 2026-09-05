import { RulingFailure, type StandingRulingsView } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { standingRulingSeen } from "#ruling-projection.ts";
import { rulingStaleness } from "#ruling-staleness.ts";

const standingSeen = (ruling: Ruling, stale: boolean): Effect.Effect<StandingRulingsView["rulings"][number], RulingFailure> =>
	Option.match(ruling.answer, {
		onNone: () => new RulingFailure({ message: `ruling ${ruling.id} stands without an answer` }),
		onSome: (answer) => Effect.succeed(standingRulingSeen(ruling, answer, stale)),
	});

export const standing = Effect.fn("RulingDisplay.standing")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const ruled = yield* rulings.standing([]);
	const subjects = ruled.flatMap((ruling) => ruling.subjects);
	const voyageIds = subjects.flatMap((subject) => (subject.kind === "voyage" ? [subject.id] : []));
	const memberships = yield* db.VoyagePiece.where((membership) => membership.voyageId.in(voyageIds)).all();
	const pieceIds = [
		...subjects.flatMap((subject) => (subject.kind === "piece" ? [subject.id] : [])),
		...memberships.map((membership) => membership.pieceId),
	];
	const pieces = yield* db.Piece.where((piece) => piece.id.in(pieceIds)).all();
	const assignments = yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(assignments.map((assignment) => assignment.agentId)))
		.where((agent) => agent.status.in(["alive", "spawning"]))
		.all();
	const stale = rulingStaleness({
		...(yield* readAgentExecution(agents)),
		...(yield* readOutcomes(pieceIds)),
		assignments,
		memberships,
		pieces,
	});
	return { rulings: yield* Effect.forEach(ruled, (ruling) => standingSeen(ruling, stale(ruling))) };
});
