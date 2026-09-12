import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const BoardEntryId = Id.brand("BoardEntryId");
export type BoardEntryId = typeof BoardEntryId.Type;

export const BoardId = Id.brand("BoardId");
export type BoardId = typeof BoardId.Type;

export type BoardOwner =
	| { readonly kind: "agent"; readonly agentId: string }
	| { readonly kind: "piece"; readonly pieceId: PieceId }
	| { readonly kind: "voyage"; readonly voyageId: VoyageId };

export const agentBoard = (agentId: string): BoardId => BoardId.make(`agent:${agentId}`);

export const pieceBoard = (pieceId: PieceId): BoardId => BoardId.make(`piece:${pieceId}`);

export const voyageBoard = (voyageId: VoyageId): BoardId => BoardId.make(`voyage:${voyageId}`);

export const ownerOf = (board: BoardId): BoardOwner | undefined => {
	const cut = board.indexOf(":");
	if (cut < 1 || cut === board.length - 1) {
		return undefined;
	}
	const owner = board.slice(cut + 1);
	const kind = board.slice(0, cut);
	if (kind === "agent") {
		return { agentId: owner, kind };
	}
	if (kind === "piece") {
		return { kind, pieceId: PieceId.make(owner) };
	}
	return kind === "voyage" ? { kind, voyageId: VoyageId.make(owner) } : undefined;
};
