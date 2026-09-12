import { request } from "@antumbra/domain-starts/commands/request.ts";
import { type Spawn, StartFailure } from "@antumbra/domain-starts/commands/submit.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { binding, identity } from "#starts/request.ts";

export const spawn = Effect.fn("Starts.spawn")(function* (input: Spawn) {
	const commit = yield* Commit;
	const ids = identity(input.requestId);
	const tools = yield* binding({ ...ids, role: input.role });
	yield* commit
		.commit(request, {
			...ids,
			...tools,
			requestId: input.requestId,
			backend: input.backend,
			source: "direct",
			role: input.role,
			charter: input.charter,
			model: input.model ?? null,
			effort: input.effort ?? null,
			pieceId: null,
			voyageId: null,
		})
		.pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.mapError((failure) => new StartFailure({ message: failure._tag })),
		);
	return { requestId: input.requestId, agentId: ids.agentId };
});
