import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Data, type Effect, type Option, type Scope, type Stream } from "effect";
import type { BackendCapacitySource } from "#backend-capacity.ts";
import type { SessionAudit } from "#session-audit.ts";
import type { DirectTool } from "#tools.ts";

export interface SessionInputImagePart {
	readonly attachmentId: string;
	readonly mediaType: "image/jpeg" | "image/png" | "image/webp";
	readonly path: string;
	readonly position: number;
	readonly type: "image";
}

export interface SessionInputTextPart {
	readonly text: string;
	readonly type: "text";
}

export interface SessionInput {
	readonly id?: string | undefined;
	readonly parts: readonly [SessionInputImagePart | SessionInputTextPart, ...(SessionInputImagePart | SessionInputTextPart)[]];
}

// why: shaped from the widest backend protocol surveyed and narrowed per
// backend — the Claude SDK surface is not the interface ceiling.
export interface BackendCapabilities {
	readonly fork: boolean;
	// why: older/external plugins omit this additive capability and therefore
	// remain fail-closed text-only until they explicitly prove their image path.
	readonly imageInput?: boolean;
	readonly liveInterrupt: boolean;
	readonly multiClient: boolean;
}

export class BackendFailure extends Data.TaggedError("BackendFailure")<{
	readonly detail: string;
	readonly tag: string;
}> {
	override get message(): string {
		return `${this.tag}: ${this.detail}`;
	}
}

// why: two delivery verbs, both on every backend. `queue` lands at the next
// full-turn boundary; `steer` injects into the running turn. Their effects
// succeed only once the provider transport accepts the text — anything held
// only in adapter memory stays pending and fails if the session closes. This
// is transport acceptance, never evidence that the agent read it. Which verb
// a caller uses is precedence policy the domain owns, never the backend's.
export interface SessionHandle {
	readonly events: Stream.Stream<AgentEvent, BackendFailure>;
	readonly interrupt: Effect.Effect<void, BackendFailure>;
	// why: the backend's own transcript id, known only once the provider
	// reports it — our session id stays authoritative; this is what resume
	// hands back to the provider.
	readonly nativeRef: Effect.Effect<Option.Option<string>>;
	readonly queue: (input: SessionInput) => Effect.Effect<void, BackendFailure>;
	readonly steer: (input: SessionInput) => Effect.Effect<void, BackendFailure>;
}

export interface OpenSessionOptions {
	readonly cwd: string;
	readonly resume: Option.Option<string>;
	readonly sessionId: string;
	// why: the session's whole tool set, decided by the caller at open. An
	// empty array is the explicit "this session acts through nothing", never
	// an omission a backend may fill in for itself.
	readonly tools: ReadonlyArray<DirectTool>;
}

// why: opening is scoped — releasing the scope is the only way a session
// process ends, so an abandoned handle can never leak a subprocess.
export interface AgentBackend {
	// why: what the provider can still be asked once its stream has stopped
	// carrying a node — the reading that decides whether the record of that
	// node is whole. It is a capability of the backend rather than of a live
	// handle because the questions are about stored work, and the record asks
	// them again long after the turn that produced it.
	readonly audit: SessionAudit;
	// why: provider/account capacity changes independently of every Session.
	// Optional keeps older external plugins source-compatible; a missing source
	// makes no availability claim and therefore cannot place a hold.
	readonly capacity?: BackendCapacitySource;
	readonly capabilities: BackendCapabilities;
	readonly openSession: (options: OpenSessionOptions) => Effect.Effect<SessionHandle, BackendFailure, Scope.Scope>;
	readonly tag: string;
}
