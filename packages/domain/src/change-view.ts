import type { ChangeRow } from "@antumbra/changes";
import type { ChangeChecks, ChangeMergeable, ChangeReview, ChangeStage } from "@antumbra/vocabulary/change";
import type { VoyageWorld } from "#voyage-rows.ts";

export interface ChangeView {
	readonly activityAt: Date;
	readonly checks: ChangeChecks;
	readonly externalId: string | null;
	readonly host: string;
	readonly id: string;
	readonly isDraft: boolean;
	readonly mergeable: ChangeMergeable;
	readonly observedAt: Date;
	readonly repoId: string;
	readonly repoName: string;
	readonly review: ChangeReview;
	readonly stage: ChangeStage;
	readonly title: string;
	readonly url: string | null;
}

export const repoNameOf = (world: VoyageWorld, repoId: string): string => world.repos.get(repoId)?.name ?? repoId;

export const changeView = (repoName: string, change: ChangeRow): ChangeView => ({
	activityAt: change.activityAt,
	checks: change.checks,
	externalId: change.externalId,
	host: change.host,
	id: change.id,
	isDraft: change.draftAt !== null,
	mergeable: change.mergeable,
	observedAt: change.observedAt,
	repoId: change.repoId,
	repoName,
	review: change.review,
	stage: change.stage,
	title: change.title,
	url: change.url,
});
