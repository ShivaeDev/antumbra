import type * as Source from "@antumbra/domain-changes/commands/publication-failed.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ChangePublicationFailedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const publicationFailed = fact("ChangePublicationFailed", ChangePublicationFailedPayload.fields);
export const failPublication = Effect.fn("changes.failPublication")(function* (
	input: typeof Source.failPublication.Input.Type,
): Effect.fn.Return<typeof Source.failPublication.emits.Payload.Type, RejectedBy<typeof Source.failPublication.rejections>, Records> {
	const rows = yield* Records;

	const held = (yield* rows.change
		.findMany({ where: { id: input.changeId }, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie))[0];
	return {
		change:
			held === undefined || held.stage !== "prepared" || held.publicationRequestId !== input.attemptId
				? null
				: { ...held, publicationError: input.message },
	};
});
