import { freshFeedback } from "@antumbra/domain-changes/commands/feedback.ts";
import { selectObservation } from "@antumbra/domain-changes/commands/observation.ts";
import type * as Source from "@antumbra/domain-changes/commands/observe.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { claimed } from "@antumbra/server-changes/logic/commands/claims.ts";
import { observeRow } from "@antumbra/server-changes/logic/commands/observe-row.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as changeFeedbackSelection } from "@antumbra/server-storage/records/change-feedback.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const observe = Effect.fn("changes.observe")(function* (
	input: typeof Source.observe.Input.Type,
	reject: typeof Source.observe.reject,
): Effect.fn.Return<typeof Source.observe.emits.Payload.Type, RejectedBy<typeof Source.observe.rejections>, Records> {
	const rows = yield* Records;

	const seen = input.observation;
	const repository = (yield* rows.repo
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection })
		.pipe(Effect.orDie)).find((row) => row.id === seen.repoId);
	if (
		repository !== undefined &&
		(yield* claimed(input.attachment._tag === "Claimed" ? input.attachment.agentId : null, repository.source, seen.headRef))
	)
		return yield* reject.ResourceClaimed({ source: repository.source });
	const selected = selectObservation(
		yield* rows.change.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection }).pipe(Effect.orDie),
		input.host,
		seen,
		input.attachment,
	);
	if (selected._tag === "Collision") return yield* reject.ChangeIdentityCollision({ externalId: seen.externalId });
	if (selected._tag === "Conflict") return yield* reject.ChangeObservationConflict({ externalId: seen.externalId });
	if (selected.row === undefined) return { change: null, transition: null, feedback: [] };
	const held = yield* rows.changeFeedback
		.findMany({ where: { changeId: selected.row.id }, orderBy: { field: "storage_order", direction: "asc" }, select: changeFeedbackSelection })
		.pipe(Effect.orDie);
	const observed = yield* observeRow(selected.row, seen, input.observedAt);
	return { ...observed, feedback: freshFeedback(selected.row.id, seen, held) };
});
