import type * as Source from "@antumbra/domain-changes/commands/adoption-failed.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ChangeAdoptionFailedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { selection as changeAdoptionRequestSelection } from "@antumbra/server-storage/records/change-adoption-request.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const adoptionFailed = fact("ChangeAdoptionFailed", ChangeAdoptionFailedPayload.fields);
export const failAdoption = Effect.fn("changes.failAdoption")(function* (
	input: typeof Source.failAdoption.Input.Type,
): Effect.fn.Return<typeof Source.failAdoption.emits.Payload.Type, RejectedBy<typeof Source.failAdoption.rejections>, Records> {
	const rows = yield* Records;

	const held = (yield* rows.changeAdoptionRequest
		.findMany({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: changeAdoptionRequestSelection })
		.pipe(Effect.orDie))[0];
	return { id: held === undefined || held.url !== input.url ? null : held.id, message: input.message };
});
