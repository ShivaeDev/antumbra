import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import type { StoredBackendCapacityInvalid } from "@antumbra/provider-capacity/model";
import type { SessionInputFailure } from "@antumbra/session-inputs";
import type { InvalidSessionExecutionStatus, InvalidSessionExecutionTransition } from "@antumbra/vocabulary/agent-runtime/session-execution.ts";
import type { StoredAgentSessionStatusInvalid } from "@antumbra/vocabulary/agent-runtime/stored-session.ts";
import { Data } from "effect";
import type { SubsessionAttachRefused } from "#attach-roots.ts";
import type { SessionEnded, SessionNotFound } from "#errors.ts";
import type { RouseRefused } from "#reach.ts";

export class SessionInputBackendTextOnly extends Data.TaggedError("SessionInputBackendTextOnly")<{ readonly backend: string }> {
	override get message(): string {
		return `backend_text_only: ${this.backend} has no proven image-input capability`;
	}
}

export class SessionInputRetryAmbiguous extends Data.TaggedError("SessionInputRetryAmbiguous")<{ readonly inputId: string }> {
	override get message(): string {
		return `ambiguous: input ${this.inputId} may already have reached the provider; check the transcript before retrying`;
	}
}

export type SessionSendRefused =
	| BackendFailure
	| InvalidSessionExecutionStatus
	| InvalidSessionExecutionTransition
	| PrismaError
	| RouseRefused
	| SessionEnded
	| SessionInputBackendTextOnly
	| SessionInputFailure
	| SessionInputRetryAmbiguous
	| SessionNotFound
	| StoredBackendCapacityInvalid
	| StoredAgentSessionStatusInvalid
	| SubsessionAttachRefused;

export type SessionSendReceipt = "accepted" | "queued_for_wake";
