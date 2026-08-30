import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import type { SessionInputFailure } from "@antumbra/session-inputs";
import type {
	InvalidSessionExecutionStatus,
	InvalidSessionExecutionTransition,
	StoredAgentSessionStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Data } from "effect";
import type { StoredBackendCapacityInvalid } from "#backend-capacity.ts";
import type { SessionEnded, SessionNotFound } from "#errors.ts";
import type { RouseRefused } from "#kernel-reach.ts";
import type { SubsessionAttachRefused } from "#session-attach-roots.ts";

export class SessionInputBackendTextOnly extends Data.TaggedError(
	"SessionInputBackendTextOnly",
)<{ readonly backend: string }> {
	override get message(): string {
		return `backend_text_only: ${this.backend} has no proven image-input capability`;
	}
}

export class SessionInputRetryAmbiguous extends Data.TaggedError(
	"SessionInputRetryAmbiguous",
)<{ readonly inputId: string }> {
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
