import { Data, type Effect, type Scope, type Stream } from "effect";

// why: shaped from the widest backend protocol surveyed and narrowed per
// backend — the Claude SDK surface is not the interface ceiling.
export interface BackendCapabilities {
	readonly fork: boolean;
	readonly liveInterrupt: boolean;
	readonly multiClient: boolean;
	readonly steer: boolean;
}

export interface WireEvent {
	readonly kind: string;
	readonly payload: string;
}

export class BackendFailure extends Data.TaggedError("BackendFailure")<{
	readonly detail: string;
	readonly tag: string;
}> {}

export interface SessionHandle {
	readonly events: Stream.Stream<WireEvent, BackendFailure>;
	readonly interrupt: Effect.Effect<void, BackendFailure>;
	readonly send: (text: string) => Effect.Effect<void, BackendFailure>;
}

export interface OpenSessionOptions {
	readonly cwd: string;
	readonly resume: boolean;
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
