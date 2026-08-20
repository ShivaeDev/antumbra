export { captureWorktreeChange } from "#change-evidence.ts";
export { GitAuthRequired, type GitError, GitPushRefused } from "#errors.ts";
export { cloneMirror, refreshMirror } from "#mirrors.ts";
export { pushBranch } from "#push.ts";
export { branchExists, inspectWorktreeIdentity } from "#worktree-identity.ts";
export {
	addExistingWorktree,
	addWorktree,
	countUnpushedBranchCommits,
	deleteBranch,
	inspectWorktree,
	pruneWorktrees,
	removeWorktree,
} from "#worktrees.ts";
