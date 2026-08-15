import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { SpawnFields } from "#spawn.ts";

// why: the link is written beside the agent row, not after the session opens,
// so a spawn that fails partway still leaves the piece pointing at the agent
// it was given — the derived state reads that agent's status and puts the
// piece back in the pool rather than losing the attempt.
export const assignToPiece = (deps: AgentDeps, payload: SpawnFields) => {
	const pieceId = payload.pieceId;
	if (pieceId === undefined) {
		return Effect.void;
	}
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(
			deps.db.PieceAgent.where({ agentId: payload.agentId, pieceId }).first(),
		);
		if (Option.isSome(existing)) {
			return;
		}
		yield* provide(
			deps.writer.write(
				deps.db.PieceAgent.create({ agentId: payload.agentId, pieceId }),
			),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
	});
};
