import type * as Source from "@antumbra/domain-changes/commands/freeze.ts";
import { change as changeRecordSchema } from "@antumbra/domain-changes/rows/change.ts";
import { repo as repoRecordSchema } from "@antumbra/domain-repos/rows/repo.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { claimed, ownerAvailable } from "@antumbra/server-changes/logic/commands/claims.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";
export const freeze = Effect.fn("changes.freeze")(function* (
	input: typeof Source.freeze.Input.Type,
	reject: typeof Source.freeze.reject,
): Effect.fn.Return<typeof Source.freeze.emits.Payload.Type, RejectedBy<typeof Source.freeze.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.change.count({ where: { id: input.changeId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownChange({ id: input.changeId });
	const held = yield* rows.change.findById(input.changeId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(changeRecordSchema.Row)), Effect.orDie);
	if (held.openedByAgentId !== null && !(yield* ownerAvailable(held.openedByAgentId)))
		return yield* reject.ResourceOwnerUnavailable({ agentId: held.openedByAgentId });
	const repository = yield* rows.repo.findById(held.repoId).pipe(Effect.flatMap(Schema.decodeUnknownEffect(repoRecordSchema.Row)), Effect.orDie);
	if (yield* claimed(held.openedByAgentId, repository.source, held.headRef))
		return yield* reject.ResourceClaimed({ agentId: held.openedByAgentId ?? "" });
	const frozen =
		held.proposalFrozenAt !== null || held.stage !== "prepared"
			? held
			: {
					...held,
					title: input.title,
					body: input.body,
					baseRef: input.base ?? repository.defaultRef,
					draftAt: input.draft ? input.at : null,
					proposalFrozenAt: input.at,
				};
	return { change: frozen.stage !== "prepared" ? frozen : { ...frozen, publicationRequestId: input.requestId, publicationError: null } };
});
