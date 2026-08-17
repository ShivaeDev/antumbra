import type { Option } from "effect";

// why: who is calling is decided when the tools are built, at spawn, so a
// handler never has to trust anything the model says about itself. Dispatched
// crew answer to a piece within an exact Voyage, captains answer directly to a
// Voyage, and a hand-spawned agent may answer to neither.
export interface SessionIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly sessionId: string;
	readonly voyageId: Option.Option<string>;
}
