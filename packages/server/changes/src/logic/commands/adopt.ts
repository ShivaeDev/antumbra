import type * as Source from "@antumbra/domain-changes/commands/adopt.ts";
import { type Attachment, projectObservation, selectObservation } from "@antumbra/domain-changes/commands/observation.ts";
import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import { repo as repoRecordSchema } from "@antumbra/domain-repos/rows/repo.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ChangeId, pieceChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { claimed, ownerAvailable } from "@antumbra/server-changes/logic/commands/claims.ts";
import { observeRow } from "@antumbra/server-changes/logic/commands/observe-row.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
import { submissionKey } from "#logic/commands/prepare.ts";
export const adopt = Effect.fn("changes.adopt")(function* (
	input: typeof Source.adopt.Input.Type,
	reject: typeof Source.adopt.reject,
): Effect.fn.Return<typeof Source.adopt.emits.Payload.Type, RejectedBy<typeof Source.adopt.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.piece.count({ where: { id: input.pieceId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownPiece({ id: input.pieceId });
	if (
		!(yield* rows.repo.count({ where: { id: input.repoId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownRepo({ id: input.repoId });
	if (input.agentId !== null && !(yield* ownerAvailable(input.agentId))) return yield* reject.ResourceOwnerUnavailable({ agentId: input.agentId });
	const repository = yield* rows.repo.findById(input.repoId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(repoRecordSchema.Row)), Effect.orDie);
	const seen = input.observation;
	if (seen.repoId !== input.repoId) return yield* reject.ChangeObservationConflict({ externalId: seen.externalId });
	if (yield* claimed(input.agentId, repository.source, seen.headRef)) return yield* reject.ResourceClaimed({ source: repository.source });
	const all = yield* rows.change
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie);
	const key = input.agentId === null ? null : submissionKey(input.agentId, input.repoId);
	const active = key === null ? undefined : all.find((row) => row.submissionKey === key);
	const attachment: Attachment =
		active === undefined || input.agentId === null || key === null
			? { _tag: "ExternalOnly" }
			: { _tag: "Claimed", changeId: active.id, agentId: input.agentId, submissionKey: key };
	const selected = selectObservation(all, input.host, seen, attachment);
	if (selected._tag === "Collision") return yield* reject.ChangeIdentityCollision({ externalId: seen.externalId });
	if (selected._tag === "Conflict") return yield* reject.ChangeObservationConflict({ externalId: seen.externalId });
	const now = input.observedAt;
	const candidate: ChangeRow = {
		id: ChangeId.make(input.requestId),
		repoId: input.repoId,
		host: input.host,
		title: "",
		body: "",
		headRef: seen.headRef,
		baseRef: seen.baseRef,
		headSha: null,
		preparedHeadRef: null,
		preparedHeadSha: null,
		publicationRequestId: null,
		publicationError: null,
		proposalFrozenAt: null,
		worktreePath: null,
		workingDiff: null,
		workingTreeStatus: null,
		submissionKey: null,
		stage: "prepared",
		draftAt: null,
		url: null,
		externalId: null,
		checks: "none",
		review: "none",
		mergeable: "unknown",
		openedByAgentId: input.agentId,
		originSessionId: null,
		raw: null,
		activityAt: now,
		observedAt: now,
		landedAt: null,
		withdrawnAt: null,
		archivedAt: null,
		createdAt: now,
	};
	const observed =
		selected.row === undefined ? { change: projectObservation(candidate, seen, now), transition: null } : yield* observeRow(selected.row, seen, now);
	const held = observed.change ?? selected.row ?? candidate;
	return {
		adoptionId: input.adoptionId ?? null,
		change: held,
		transition: observed.transition,
		link: { id: pieceChangeId(input.pieceId, held.id), pieceId: input.pieceId, changeId: held.id, purpose: "produces" as const },
	};
});
