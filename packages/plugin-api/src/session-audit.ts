import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";

export interface NodeAuditRequest {
	readonly cwd: string;
	readonly nodeRef: string;
	readonly recorded: Effect.Effect<ReadonlyArray<string>>;
	readonly rootRef: string;
}

export interface SessionCensusRequest {
	readonly admitted: (nodeRef: string) => boolean;
	readonly cwd: string;
	readonly rootRef: string;
}

export interface CensusedNode {
	readonly nodeRef: string;
	readonly working: boolean;
}

export interface SessionCensus {
	readonly events: ReadonlyArray<AgentEvent>;
	readonly nodes: ReadonlyArray<CensusedNode>;
}

export interface SessionAudit {
	readonly census: (request: SessionCensusRequest) => Effect.Effect<SessionCensus>;
	readonly node: (request: NodeAuditRequest) => Effect.Effect<ReadonlyArray<AgentEvent>>;
}

export const noSessionAudit: SessionAudit = {
	census: () => Effect.succeed({ events: [], nodes: [] }),
	node: () => Effect.succeed([]),
};
