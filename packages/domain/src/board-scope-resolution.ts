import { BoardScope } from "@antumbra/boards";
import { Option } from "effect";
import type { SessionIdentity } from "#tool-identity.ts";

export type BoardScopeName = "piece" | "self" | "voyage";

// why: Voyage Board authority is fixed when the Session opens and rebuilt
// from the Agent's durable Voyage assignment. A Piece can belong to multiple
// Voyages, so membership cannot recover one exact calling authority.
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
