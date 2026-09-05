import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { rulingSeen } from "#ruling-projection.ts";

export const open = Effect.fn("RulingDisplay.open")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const requested = yield* rulings.open();
	const pieceIds = requested.flatMap((ruling) => ruling.gatedPieceIds);
	const requesterIds = requested.flatMap((ruling) =>
		Option.contains(ruling.rung, "captain") && ruling.requester.kind === "agent" ? [ruling.requester.agentId] : [],
	);
	const pieces = yield* db.Piece.where((piece) => piece.id.in(pieceIds))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const memberships = yield* db.VoyagePiece.where((membership) => membership.pieceId.in(pieceIds)).all();
	const crews = yield* db.VoyageAgent.where((crew) => crew.agentId.in(requesterIds)).all();
	const voyageIds = [
		...[...memberships, ...crews].map((membership) => membership.voyageId),
		...requested.flatMap((ruling) => ruling.subjects.flatMap((subject) => (subject.kind === "voyage" ? [subject.id] : []))),
	];
	const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(voyageIds))
		.orderBy((voyage) => voyage.createdAt.asc())
		.all();
	return { rulings: requested.map((ruling) => rulingSeen(ruling, { pieces, memberships, crews, voyages })) };
});
