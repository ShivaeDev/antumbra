import { Data } from "effect";

export type GhOperation =
	| "auth-status"
	| "create-change"
	| "find-change"
	| "observe-changes";

interface GhFailureFields {
	readonly detail: string;
	readonly operation: GhOperation;
}

// why: every one of these details is read by a model through a tool answer, so
// each error says what happened in a sentence a reader can act on rather than
// leaving the caller to assemble one.
export class GhUnavailable extends Data.TaggedError(
	"GhUnavailable",
)<GhFailureFields> {
	override get message(): string {
		return `gh could not be run (${this.operation}): ${this.detail}`;
	}
}

export class GhAuthRequired extends Data.TaggedError(
	"GhAuthRequired",
)<GhFailureFields> {
	override get message(): string {
		return `gh is not authenticated (${this.operation}): ${this.detail}`;
	}
}

// why: the stdout of a failed call is kept because GitHub's GraphQL endpoint
// answers partially — a batch where one pull request is gone exits nonzero and
// still returns every other node. Discarding it here would throw away the
// answer to the question that was asked.
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

export class GhOutputInvalid extends Data.TaggedError(
	"GhOutputInvalid",
)<GhFailureFields> {
	override get message(): string {
		return `gh ${this.operation} answered something unreadable: ${this.detail}`;
	}
}

export type GhError =
	| GhAuthRequired
	| GhCommandFailed
	| GhOutputInvalid
	| GhUnavailable;
