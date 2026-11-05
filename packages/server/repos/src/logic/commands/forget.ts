import type * as Source from "@antumbra/domain-repos/commands/forget.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const forget = Effect.fn("repos.forget")(function* (
	input: typeof Source.forget.Input.Type,
	reject: typeof Source.forget.reject,
): Effect.fn.Return<typeof Source.forget.emits.Payload.Type, RejectedBy<typeof Source.forget.rejections>, Records> {
	const rows = yield* Records;

	if ((yield* rows.repoReference.count({ where: { repoId: input.id } }).pipe(Effect.orDie)) > 0) {
		return yield* reject.Referenced({ id: input.id, message: "A repository named by a ruling cannot be forgotten" });
	}
	return { id: input.id };
});
