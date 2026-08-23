import { Data } from "effect";

export {
	BoardOwnerNotFound,
	BoardSourceConflict,
	MailNotAddressed,
	StoredBoardEntryInvalid,
} from "@antumbra/boards";
export {
	EdgeWouldCycle,
	PieceNotFound,
	StoredPieceVerdictInvalid,
	VoyageNotFound,
} from "@antumbra/pieces";
export {
	ResourceReclaimClaimed,
	ResourceReclaimClaimInvalid,
} from "@antumbra/resource-reclamation";
export {
	SessionAttachmentFailure,
	SessionNotLive,
} from "@antumbra/session-fabric";
export {
	CaptainAlreadyHailed,
	CaptainSessionUnavailable,
} from "#captain-errors.ts";
export {
	AgentSessionConflict,
	CurrentSessionInvalid,
} from "#current-session-errors.ts";
export {
	PieceAbandoned,
	PieceAlreadyCrewed,
	PieceNotOnVoyage,
} from "#piece-work-errors.ts";

export class AgentNotFound extends Data.TaggedError("AgentNotFound")<{
	readonly agentId: string;
}> {}

// why: a situation names a Change the host is presenting. One that has been
// forgotten, or that the host never gave a name to, has no threads, no checks
// and no merge to be blocked, so there is nothing to draft about it.
export class ChangeNotAddressable extends Data.TaggedError(
	"ChangeNotAddressable",
)<{
	readonly changeId: string;
}> {
	override get message(): string {
		return `change ${this.changeId} is not open on a host that names it`;
	}
}

export class UnknownBackendTag extends Data.TaggedError("UnknownBackendTag")<{
	readonly tag: string;
}> {}

export class AgentNotSpawnable extends Data.TaggedError("AgentNotSpawnable")<{
	readonly agentId: string;
	readonly status: string;
}> {}

// why: a birth that fails is settled back to dormant, which is what returns its
// Piece to the pool. An Agent this settlement cannot reach stays spawning, and
// a spawning Agent counts as at work forever — so the one state the settlement
// must never leave behind quietly is named, and says which Session it holds.
export class AgentBirthStranded extends Data.TaggedError("AgentBirthStranded")<{
	readonly agentId: string;
	readonly detail: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `birth of Agent ${this.agentId} for Session ${this.sessionId} could not be settled: ${this.detail}`;
	}
}

// why: an Agent answers through one open root Session at a time, and the
// database holds that rule as a partial unique index. Reaching the index turns
// the rule into a constraint violation nobody can read, so the refusal is made
// here and names the Session already open.
export class AgentRootAlreadyOpen extends Data.TaggedError(
	"AgentRootAlreadyOpen",
)<{
	readonly agentId: string;
	readonly openSessionId: string;
	readonly sessionId: string;
}> {
	override get message(): string {
		return `Agent ${this.agentId} already answers through open Session ${this.openSessionId}; ${this.sessionId} cannot open a second`;
	}
}

export class MooragePlanConflict extends Data.TaggedError(
	"MooragePlanConflict",
)<{
	readonly agentId: string;
	readonly detail: string;
}> {}

export class SessionMessageEmpty extends Data.TaggedError(
	"SessionMessageEmpty",
)<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `a message with no words cannot reach session ${this.sessionId}`;
	}
}

export class SessionIdentityMissing extends Data.TaggedError(
	"SessionIdentityMissing",
)<{
	readonly sessionId: string;
}> {}

export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `there is no session ${this.sessionId} on the fleet`;
	}
}

// why: only a root is ever attached, and the delegated conversations under it
// ride that one acquisition — so putting it to rest would take their stream
// away mid-sentence. The refusal is named rather than silent because whoever
// asked was reading a moment that had already passed, and a Session that
// quietly stayed awake would look exactly like one that had been put to rest.
export class SessionStillDelegating extends Data.TaggedError(
	"SessionStillDelegating",
)<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} still has a delegated conversation under way and cannot be put to rest`;
	}
}

// why: the one state that refuses words. Every other state either holds the
// conversation open or can be woken back into it, so this refusal is the whole
// set of ways an Agent can stop being reachable.
export class SessionEnded extends Data.TaggedError("SessionEnded")<{
	readonly sessionId: string;
}> {
	override get message(): string {
		return `session ${this.sessionId} has ended and cannot be spoken to`;
	}
}
