import type { ChangeObservation } from "@antumbra/plugin-api";
import { Effect, PubSub } from "effect";
import { rawText } from "#change-projection.ts";
import type { ChangeRow } from "#change-rows.ts";
import type { AgentDeps } from "#deps.ts";

export interface ProposedChange {
	readonly body: string;
	readonly host: string;
	readonly now: number;
	readonly observation: ChangeObservation;
	readonly openedByAgentId: string | null;
	readonly repoId: string;
}

// why: the host has already answered, so the row is that answer plus what only
// we know — which repo it belongs to, who asked for it, and the moment we
// heard. A stage that arrives already settled is stamped on the spot; the host
// is allowed to be faster than we are.
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
		raw: rawText(observation.raw),
		repoId: fields.repoId,
		review: observation.review,
		stage: observation.stage,
		title: observation.title,
		url: observation.url,
		withdrawnAt: observation.stage === "withdrawn" ? new Date(now) : null,
	};
};

// why: linking is idempotent — the same change adopted twice onto one piece is
// one relation, and the same change on two pieces is two.
export const linkPiece = (deps: AgentDeps, pieceId: string, changeId: string) =>
	deps.db.PieceChange.where({ pieceId })
		.all()
		.pipe(
			Effect.flatMap((links) =>
				links.some((link) => link.changeId === changeId)
					? Effect.void
					: Effect.asVoid(deps.db.PieceChange.create({ changeId, pieceId })),
			),
		);

export const announceChanges = (deps: AgentDeps) =>
	PubSub.publish(deps.feeds.voyages, undefined);
