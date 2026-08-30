import { Data } from "effect";

export type GhOperation = "auth-status" | "create-change" | "find-change" | "observe-changes";

interface GhFailureFields {
	readonly detail: string;
	readonly operation: GhOperation;
}

export class GhUnavailable extends Data.TaggedError("GhUnavailable")<GhFailureFields> {
	override get message(): string {
		return `gh could not answer (${this.operation}): ${this.detail}`;
	}
}

export class GhAuthRequired extends Data.TaggedError("GhAuthRequired")<GhFailureFields> {
	override get message(): string {
		return `gh is not authenticated (${this.operation}): ${this.detail}`;
	}
}

// Failed GraphQL calls can still carry a partial response on stdout.
export class GhCommandFailed extends Data.TaggedError("GhCommandFailed")<
	GhFailureFields & {
		readonly exitCode: number;
		readonly stdout: string;
	}
> {
	override get message(): string {
		return `gh ${this.operation} failed: ${this.detail}`;
	}
}

export class GhOutputInvalid extends Data.TaggedError("GhOutputInvalid")<
	GhFailureFields & {
		readonly raw?: unknown;
	}
> {
	override get message(): string {
		return `gh ${this.operation} answered something unreadable: ${this.detail}`;
	}
}

export type GhError = GhAuthRequired | GhCommandFailed | GhOutputInvalid | GhUnavailable;
