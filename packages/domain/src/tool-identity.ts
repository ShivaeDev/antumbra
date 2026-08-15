import type { Option } from "effect";

// why: who is calling is decided when the tools are built, at spawn, so a
// handler never has to trust anything the model says about itself. Crew
// answer to a piece, a captain to a voyage, and a hand-spawned agent to
// neither.
export interface SessionIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly sessionId: string;
	readonly voyageId: Option.Option<string>;
}
