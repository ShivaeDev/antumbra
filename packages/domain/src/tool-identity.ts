import type { Option } from "effect";

// why: who is calling is decided when the tools are built, at spawn, so a
// handler never has to trust anything the model says about itself.
export interface SessionIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly sessionId: string;
}
