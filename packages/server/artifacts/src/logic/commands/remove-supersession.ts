import type * as Source from "@antumbra/domain-artifacts/commands/remove-supersession.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { endpoints } from "@antumbra/server-artifacts/logic/commands/lineage.ts";
import type { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const removeSupersession = Effect.fn("Artifacts.removeSupersession")(function* (
	input: typeof Source.removeSupersession.Input.Type,
	reject: typeof Source.removeSupersession.reject,
): Effect.fn.Return<typeof Source.removeSupersession.emits.Payload.Type, RejectedBy<typeof Source.removeSupersession.rejections>, Records> {
	const { before, after } = yield* endpoints(input, reject);
	if (before.supersededByArtifactId !== null && before.supersededByArtifactId !== after.id) {
		return yield* reject.ArtifactSupersessionNotFound({ supersededArtifactId: before.id, successorArtifactId: after.id });
	}
	return input;
});
