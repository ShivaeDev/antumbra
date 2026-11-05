import type * as Source from "@antumbra/domain-changes/commands/prepare.ts";
import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import { repo as repoRecordSchema } from "@antumbra/domain-repos/rows/repo.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ChangeId, pieceChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { claimed, ownerAvailable } from "@antumbra/server-changes/logic/commands/claims.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
export const submissionKey = (agentId: string, repoId: string): string => JSON.stringify([agentId, repoId]);
interface CapturedWork {
	readonly headSha: string;
	readonly workingDiff: string;
	readonly workingTreeStatus: string;
	readonly worktreePath: string;
}
const recaptured = (stored: ChangeRow | undefined, work: CapturedWork): ChangeRow | undefined =>
	stored === undefined || stored.stage !== "prepared"
		? stored
		: {
				...stored,
				headSha: work.headSha,
				preparedHeadSha: work.headSha,
				workingDiff: work.workingDiff,
				workingTreeStatus: work.workingTreeStatus,
				worktreePath: work.worktreePath,
			};
export const prepare = Effect.fn("changes.prepare")(function* (
	input: typeof Source.prepare.Input.Type,
	reject: typeof Source.prepare.reject,
): Effect.fn.Return<typeof Source.prepare.emits.Payload.Type, RejectedBy<typeof Source.prepare.rejections>, Records> {
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
	if (!(yield* ownerAvailable(input.agentId))) return yield* reject.ResourceOwnerUnavailable({ agentId: input.agentId });
	const repository = yield* rows.repo.findById(input.repoId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(repoRecordSchema.Row)), Effect.orDie);
	if (yield* claimed(input.agentId, repository.source, input.branch)) return yield* reject.ResourceClaimed({ agentId: input.agentId });
	const key = submissionKey(input.agentId, input.repoId);
	const existing = (yield* rows.change
		.findMany({ where: { submissionKey: key }, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie))[0];
	const held: ChangeRow = recaptured(existing, input) ?? {
		id: ChangeId.make(input.requestId),
		repoId: input.repoId,
		host: input.host,
		title: "",
		body: "",
		headRef: input.branch,
		baseRef: repository.defaultRef,
		headSha: input.headSha,
		preparedHeadRef: input.branch,
		preparedHeadSha: input.headSha,
		publicationRequestId: null,
		publicationError: null,
		proposalFrozenAt: null,
		worktreePath: input.worktreePath,
		workingDiff: input.workingDiff,
		workingTreeStatus: input.workingTreeStatus,
		submissionKey: key,
		stage: "prepared",
		draftAt: null,
		url: null,
		externalId: null,
		checks: "none",
		review: "none",
		mergeable: "unknown",
		openedByAgentId: input.agentId,
		originSessionId: input.sessionId,
		raw: null,
		activityAt: input.capturedAt,
		observedAt: input.capturedAt,
		landedAt: null,
		withdrawnAt: null,
		archivedAt: null,
		createdAt: input.capturedAt,
	};
	return { change: held, link: { id: pieceChangeId(input.pieceId, held.id), pieceId: input.pieceId, changeId: held.id, purpose: "produces" } };
});
