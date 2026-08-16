export {
	GitAuthRequired,
	GitCommandFailed,
	type GitError,
	GitOutputInvalid,
	GitPushRefused,
	GitTimedOut,
	GitUnavailable,
} from "#errors.ts";
export { cloneMirror, refreshMirror } from "#mirrors.ts";
export { pushBranch } from "#push.ts";
export {
	branchExists,
	inspectWorktreeIdentity,
	type WorktreeIdentity,
} from "#worktree-identity.ts";
export {
	addExistingWorktree,
	addWorktree,
	deleteBranch,
	inspectWorktree,
	pruneWorktrees,
	removeWorktree,
	type WorktreeState,
} from "#worktrees.ts";
