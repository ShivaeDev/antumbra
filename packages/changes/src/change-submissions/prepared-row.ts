import type {
	ChangeHostRepo,
	ChangePreparationEvidence,
} from "@antumbra/plugin-api";
import type { ChangeRow } from "#change-rows.ts";
import type { Proposal, SubmitChangeInput } from "#change-submissions/model.ts";

export const submissionKey = (agentId: string, repoId: string): string =>
	JSON.stringify([agentId, repoId]);

export const preparedChange = (
	input: SubmitChangeInput,
	repo: ChangeHostRepo,
	hostTag: string,
	evidence: ChangePreparationEvidence,
	now: number,
	proposal: Proposal | undefined,
): ChangeRow => ({
	activityAt: new Date(now),
	baseRef: proposal?.base ?? repo.defaultRef,
	body: proposal?.body ?? "",
	checks: "none",
	draftAt: proposal?.draft === true ? new Date(now) : null,
	externalId: null,
	headRef: evidence.branch,
	headSha: evidence.headSha,
	// why: before external identity exists, this names the registered adapter
	// that claimed the Repo. URL and externalId alone prove host acceptance.
	host: hostTag,
	id: crypto.randomUUID(),
	landedAt: null,
	mergeable: "unknown",
	observedAt: new Date(now),
	openedByAgentId: input.agentId,
	preparedHeadRef: evidence.branch,
	preparedHeadSha: evidence.headSha,
	proposalFrozenAt: proposal === undefined ? null : new Date(now),
	raw: null,
	repoId: repo.id,
	review: "none",
	stage: "prepared",
	submissionKey: submissionKey(input.agentId, repo.id),
	title: proposal?.title ?? "",
	url: null,
	withdrawnAt: null,
	workingDiff: evidence.workingDiff,
	workingTreeStatus: evidence.workingTreeStatus,
	worktreePath: evidence.worktreePath,
});
