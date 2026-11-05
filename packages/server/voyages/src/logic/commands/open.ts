import type * as Source from "@antumbra/domain-voyages/commands/open.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { Clock, Effect } from "effect";

const NEEDS_NAME = "A voyage needs a name";

const NEEDS_NORTH_STAR = "A voyage needs a north star";

export const open = Effect.fn("voyages.open")(function* (
	input: typeof Source.open.Input.Type,
	reject: typeof Source.open.reject,
): Effect.fn.Return<typeof Source.open.emits.Payload.Type, RejectedBy<typeof Source.open.rejections>> {
	const name = input.name.trim();
	const northStar = input.northStar.trim();
	if (name === "") {
		return yield* reject.Blank({ field: "name", message: NEEDS_NAME });
	}
	if (northStar === "") {
		return yield* reject.Blank({ field: "northStar", message: NEEDS_NORTH_STAR });
	}
	const at = yield* Clock.currentTimeMillis;
	return {
		captain: { backend: input.captainBackend, effort: input.captainEffort, model: input.captainModel },
		context: input.context,
		crew: { backend: input.crewBackend, effort: input.crewEffort, model: input.crewModel },
		id: VoyageId.make(input.requestId),
		kind: input.kind,
		name,
		northStar,
		openedAt: new Date(at).toISOString(),
	};
});
