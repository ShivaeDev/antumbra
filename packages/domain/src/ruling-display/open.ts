import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { namedIds } from "#ruling-names.ts";
import { rulingSeen } from "#ruling-projection.ts";

export const open = Effect.fn("RulingDisplay.open")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const requested = yield* rulings.open();
	const named = namedIds(requested);
	const pieceIds = [...requested.flatMap((ruling) => ruling.gatedPieceIds), ...named.pieces];
	const requesterIds = requested.flatMap((ruling) =>
		Option.contains(ruling.rung, "captain") && ruling.requester.kind === "agent" ? [ruling.requester.agentId] : [],
	);
	const pieces = yield* db.Piece.where((piece) => piece.id.in(pieceIds))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const memberships = yield* db.VoyagePiece.where((membership) => membership.pieceId.in(pieceIds)).all();
	const crews = yield* db.VoyageAgent.where((crew) => crew.agentId.in(requesterIds)).all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(named.agents)).all();
	const repos = yield* db.Repo.where((repo) => repo.id.in(named.repos)).all();
	const voyageIds = [...[...memberships, ...crews].map((membership) => membership.voyageId), ...named.voyages];
	const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(voyageIds))
		.orderBy((voyage) => voyage.createdAt.asc())
		.all();
	return { rulings: requested.map((ruling) => rulingSeen(ruling, { agents, crews, memberships, pieces, repos, voyages })) };
});
