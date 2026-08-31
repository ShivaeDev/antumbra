import { BoardScope } from "@antumbra/boards";
import { Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export type BoardScopeName = "piece" | "self" | "voyage";

const voyageScope = (identity: SessionIdentity) => Option.map(identity.voyageId, (voyageId): BoardScope => BoardScope.Voyage({ voyageId }));

export const resolveBoardScope = (identity: SessionIdentity, name: BoardScopeName) => {
	if (name === "self") {
		return Option.some<BoardScope>(BoardScope.Agent({ agentId: identity.agentId }));
	}
	if (name === "piece") {
		return Option.map(identity.pieceId, (pieceId): BoardScope => BoardScope.Piece({ pieceId }));
	}
	return voyageScope(identity);
};
