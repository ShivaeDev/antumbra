import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";

// why: what a provider can still be asked about one node after its stream has
// stopped carrying it. `recorded` is the node's own journaled provider bytes,
// handed back so the lane that wrote them can read them again — only it knows
// what a line of its own transcript is called. It is an effect because a lane
// that needs no such comparison should never pay for the read.
export interface NodeAuditRequest {
	readonly cwd: string;
	readonly nodeRef: string;
	readonly recorded: Effect.Effect<ReadonlyArray<string>>;
	readonly rootRef: string;
}

// why: a census asks the provider which delegated work a session ever had, so
// it has to be told what the record already holds — the answer is the rest.
export interface SessionCensusRequest {
	readonly admitted: (nodeRef: string) => boolean;
	readonly cwd: string;
	readonly rootRef: string;
}

// why: an audit reads and never attaches. Both answers are neutral events the
// record journals as it journals a live frame, so a finding travels the one
// path the log already has instead of a second writer of its own. Neither can
// fail: a provider that cannot be asked is itself a fact about the record, and
// the lane says so in a gap rather than by failing the audit.
export interface SessionAudit {
	readonly census: (
		request: SessionCensusRequest,
	) => Effect.Effect<ReadonlyArray<AgentEvent>>;
	readonly node: (
		request: NodeAuditRequest,
	) => Effect.Effect<ReadonlyArray<AgentEvent>>;
}

// why: a backend with no second surface to read — a scripted one, or a
// provider that stores nothing beside its stream — says so once here rather
// than leaving the capability optional, which would read as "perhaps" at every
// call site that has to decide what an absent audit means.
export const noSessionAudit: SessionAudit = {
	census: () => Effect.succeed([]),
	node: () => Effect.succeed([]),
};
