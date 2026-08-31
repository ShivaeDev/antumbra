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

export interface BackendCapabilities {
	readonly imageInput: boolean;
}

export class BackendFailure extends Data.TaggedError("BackendFailure")<{
	readonly detail: string;
	readonly tag: string;
}> {
	override get message(): string {
		return `${this.tag}: ${this.detail}`;
	}
}

export interface SessionHandle {
	readonly events: Stream.Stream<AgentEvent, BackendFailure>;
	readonly interrupt: Effect.Effect<void, BackendFailure>;
	readonly nativeRef: Effect.Effect<Option.Option<string>>;
	readonly queue: (input: SessionInput) => Effect.Effect<void, BackendFailure>;
	readonly steer: (input: SessionInput) => Effect.Effect<void, BackendFailure>;
}

export interface OpenSessionOptions {
	readonly cwd: string;
	readonly resume: Option.Option<string>;
	readonly sessionId: string;
	readonly tools: ReadonlyArray<DirectTool>;
}

export interface AgentBackend {
	readonly audit: SessionAudit;
	readonly capacity?: BackendCapacitySource;
	readonly capabilities: BackendCapabilities;
	readonly openSession: (options: OpenSessionOptions) => Effect.Effect<SessionHandle, BackendFailure, Scope.Scope>;
	readonly tag: string;
}
