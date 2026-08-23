import type { ChangeStage } from "@antumbra/plugin-api";
import type { ChangeRow } from "#change-rows.ts";

const OBSERVED = new Date("2026-08-15T09:00:00.000Z");

export interface ChangeFields {
	readonly headRef: string;
	readonly id: string;
	readonly repoId: string;
	readonly stage: ChangeStage;
}

export const changeOf = (fields: ChangeFields): ChangeRow => ({
	activityAt: OBSERVED,
	baseRef: "main",
	body: "",
	checks: "none",
	draftAt: null,
	externalId: fields.id,
	headRef: fields.headRef,
	headSha: null,
	host: "scripted",
	id: fields.id,
	landedAt: fields.stage === "landed" ? OBSERVED : null,
	mergeable: "clean",
	observedAt: OBSERVED,
	openedByAgentId: null,
	originSessionId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	proposalFrozenAt: null,
	raw: null,
	repoId: fields.repoId,
	review: "none",
	stage: fields.stage,
	submissionKey: null,
	title: fields.id,
	url: null,
	withdrawnAt: fields.stage === "withdrawn" ? OBSERVED : null,
	workingDiff: null,
	workingTreeStatus: null,
	worktreePath: null,
});
