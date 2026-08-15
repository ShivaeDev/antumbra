import type { AgentEvent } from "@antumbra/session-events";
import {
	Data,
	type Effect,
	type Option,
	type Scope,
	type Stream,
} from "effect";

// why: shaped from the widest backend protocol surveyed and narrowed per
// backend — the Claude SDK surface is not the interface ceiling.
export interface BackendCapabilities {
	readonly fork: boolean;
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
// full-turn boundary; `steer` injects into the running turn. Which one a
// caller uses is a precedence policy the domain owns, never the backend's.
export interface SessionHandle {
	readonly events: Stream.Stream<AgentEvent, BackendFailure>;
	readonly interrupt: Effect.Effect<void, BackendFailure>;
	// why: the backend's own transcript id, known only once the provider
	// reports it — our session id stays authoritative; this is what resume
	// hands back to the provider.
	readonly nativeRef: Effect.Effect<Option.Option<string>>;
	readonly queue: (text: string) => Effect.Effect<void, BackendFailure>;
	readonly steer: (text: string) => Effect.Effect<void, BackendFailure>;
}

export interface OpenSessionOptions {
	readonly cwd: string;
	readonly resume: Option.Option<string>;
	readonly sessionId: string;
}

// why: opening is scoped — releasing the scope is the only way a session
// process ends, so an abandoned handle can never leak a subprocess.
export interface AgentBackend {
	readonly capabilities: BackendCapabilities;
	readonly openSession: (
		options: OpenSessionOptions,
	) => Effect.Effect<SessionHandle, BackendFailure, Scope.Scope>;
	readonly tag: string;
}
