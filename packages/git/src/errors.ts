import { Data } from "effect";

export type GitOperation =
	| "clone-mirror"
	| "refresh-mirror"
	| "add-worktree"
	| "inspect-branch"
	| "inspect-worktree"
	| "remove-worktree"
	| "prune-worktrees"
	| "delete-branch"
	| "push-branch";

interface GitFailureFields {
	readonly detail: string;
	readonly operation: GitOperation;
}

export class GitAuthRequired extends Data.TaggedError("GitAuthRequired")<GitFailureFields> {}

export class GitCommandFailed extends Data.TaggedError("GitCommandFailed")<GitFailureFields & { readonly exitCode: number }> {}

export class GitOutputInvalid extends Data.TaggedError("GitOutputInvalid")<GitFailureFields> {}

// why: refused before git is spawned, so it is not a failed command — the
// branch a caller asked for was never one this system is allowed to move.
// The detail reaches a model through a tool answer, so it reads as a sentence.
export class GitPushRefused extends Data.TaggedError("GitPushRefused")<{
	readonly branch: string;
	readonly detail: string;
}> {
	override get message(): string {
		return `refused to push ${this.branch}: ${this.detail}`;
	}
}

export class GitTimedOut extends Data.TaggedError("GitTimedOut")<GitFailureFields & { readonly timeoutMillis: number }> {}

export class GitUnavailable extends Data.TaggedError("GitUnavailable")<GitFailureFields> {}

export type GitError = GitAuthRequired | GitCommandFailed | GitOutputInvalid | GitTimedOut | GitUnavailable;
