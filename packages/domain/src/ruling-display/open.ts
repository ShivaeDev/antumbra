import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { Voyages } from "@antumbra/voyages";
import { Effect, Option } from "effect";
import { membershipsOf, piecesByIds } from "#piece-reading.ts";
import { gatedPiecesSeen } from "#ruling-gated-pieces.ts";
import { namedIds } from "#ruling-names.ts";
import { rulingSeen } from "#ruling-projection.ts";
import { byId } from "#voyage-row-projection.ts";

export const open = Effect.fn("RulingDisplay.open")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const sailing = yield* Voyages;
	const requested = yield* rulings.open();
	const named = namedIds(requested);
	const gatedPieceIds = requested.flatMap((ruling) => ruling.gatedPieceIds);
	const pieceIds = [...gatedPieceIds, ...named.pieces];
	const requesterIds = requested.flatMap((ruling) =>
		Option.contains(ruling.rung, "captain") && ruling.requester.kind === "agent" ? [ruling.requester.agentId] : [],
	);
	const pieces = yield* piecesByIds(pieceIds);
	const memberships = membershipsOf(pieces);
	const crews = yield* db.VoyageAgent.where((crew) => crew.agentId.in(requesterIds)).all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(named.agents)).all();
	const repos = yield* db.Repo.where((repo) => repo.id.in(named.repos)).all();
	const voyageIds = new Set([...[...memberships, ...crews].map((membership) => membership.voyageId), ...named.voyages]);
	const voyages = (yield* sailing.list()).filter((voyage) => voyageIds.has(voyage.id));
	const names = { agents: byId(agents), pieces: byId(pieces), repos: byId(repos), voyages: byId(voyages) };
	const gated = new Set(gatedPieceIds);
	const gatedPieces = gatedPiecesSeen(
		pieces.filter((piece) => gated.has(piece.id)),
		memberships,
		names.voyages,
	);
	return { rulings: requested.map((ruling) => rulingSeen(ruling, { crews, gatedPieces, names, voyages })) };
});
