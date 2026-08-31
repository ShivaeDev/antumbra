import type { ChangeObservation } from "@antumbra/plugin-api";
import { rawText } from "#change-projection.ts";
import type { ChangeRow } from "#change-rows.ts";

interface ProposedChange {
	readonly body: string;
	readonly host: string;
	readonly now: number;
	readonly observation: ChangeObservation;
	readonly openedByAgentId: string | null;
	readonly originSessionId: string | null;
	readonly repoId: string;
}

export const proposedChange = (fields: ProposedChange): ChangeRow => {
	const { now, observation } = fields;
	return {
		activityAt: new Date(observation.activityAt),
		baseRef: observation.baseRef,
		body: fields.body,
		checks: observation.checks,
		draftAt: observation.isDraft ? new Date(now) : null,
		externalId: observation.externalId,
		headRef: observation.headRef,
		headSha: observation.headSha,
		host: fields.host,
		id: crypto.randomUUID(),
		landedAt: observation.stage === "landed" ? new Date(now) : null,
		mergeable: observation.mergeable,
		observedAt: new Date(now),
		openedByAgentId: fields.openedByAgentId,
		originSessionId: fields.originSessionId,
		preparedHeadRef: null,
		preparedHeadSha: null,
		proposalFrozenAt: null,
		raw: rawText(observation.raw),
		repoId: fields.repoId,
		review: observation.review,
		stage: observation.stage,
		submissionKey: null,
		title: observation.title,
		url: observation.url,
		withdrawnAt: observation.stage === "withdrawn" ? new Date(now) : null,
		workingDiff: null,
		workingTreeStatus: null,
		worktreePath: null,
	};
};
