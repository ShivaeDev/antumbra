import type * as Source from "@antumbra/domain-changes/commands/retry-adoption.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ChangeAdoptionRetriedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const adoptionRetried = fact("ChangeAdoptionRetried", ChangeAdoptionRetriedPayload.fields);
export const retryAdoption = Effect.fn("changes.retryAdoption")(function* (
	input: typeof Source.retryAdoption.Input.Type,
	reject: typeof Source.retryAdoption.reject,
): Effect.fn.Return<typeof Source.retryAdoption.emits.Payload.Type, RejectedBy<typeof Source.retryAdoption.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.changeAdoptionRequest.count({ where: { id: input.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownRequest({ id: input.id });
	return { id: input.id, url: input.url };
});
