import type { Option } from "effect";

export interface SessionIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly sessionId: string;
	readonly voyageId: Option.Option<string>;
}

export interface SessionRecoveryContext {
	readonly backend: string;
	readonly cwd: string;
	readonly identity: SessionIdentity;
	readonly nativeRef: string;
	readonly role: string;
}
