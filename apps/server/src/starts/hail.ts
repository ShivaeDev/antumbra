import { captain } from "@antumbra/domain-agents/queries/captain.ts";
import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { requestCaptain } from "@antumbra/domain-starts/commands/request-captain.ts";
import { StartFailure } from "@antumbra/domain-starts/commands/submit.ts";
import type { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { byId } from "@antumbra/domain-voyages/queries/by-id.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { charter } from "#starts/charter.ts";
import { binding, identity } from "#starts/request.ts";

export const hail = Effect.fn("Starts.hail")(function* (input: { requestId: Request; voyageId: VoyageId }) {
	const live = yield* Live;
	const commit = yield* Commit;
	const voyage = yield* live.read(byId, { id: input.voyageId });
	if (voyage === null) return yield* new StartFailure({ message: "Voyage not found" });
	const ids = identity(input.requestId);
	const tools = yield* binding({ ...ids, voyageId: voyage.id, role: "captain" });
	const settings = yield* live.read(resolve, { voyageId: voyage.id, role: voyage.kind === "flagship" ? "flagship" : "captain" });
	yield* commit
		.commit(requestCaptain, {
			...ids,
			...tools,
			...settings,
			requestId: input.requestId,
			voyageId: voyage.id,
			source: "direct",
			pieceId: null,
			role: "captain",
			charter: yield* charter(ids.agentId, voyage, null),
		})
		.pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.mapError((failure) => new StartFailure({ message: failure._tag })),
		);
	const current = yield* live.read(captain, { voyageId: voyage.id });
	return { requestId: input.requestId, agentId: current?.id ?? ids.agentId };
});
