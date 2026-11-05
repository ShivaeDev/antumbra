import type * as Source from "@antumbra/domain-capacity/commands/release.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const release = Effect.fn("capacity.release")(function* (
	input: typeof Source.release.Input.Type,
	reject: typeof Source.release.reject,
): Effect.fn.Return<typeof Source.release.emits.Payload.Type, RejectedBy<typeof Source.release.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.backendCatalog.count({ where: { backend: input.backend } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	) {
		return yield* reject.UnknownBackend({ backend: input.backend, message: "This provider is not registered." });
	}
	return input;
});
