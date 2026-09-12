import { adopt } from "@antumbra/domain-changes/commands/adopt.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { ChangeHostRefused } from "@antumbra/platform-change-host/port.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Clock, Effect } from "effect";
import { claimingHost } from "#changes/host.ts";
import { namedRepo, readWorld } from "#changes/read.ts";
export const adoptExternal = Effect.fn("changes.adoptExternal")(function* (input: {
	readonly adoptionId?: string;
	readonly callId: string;
	readonly pieceId: string;
	readonly repo: string;
	readonly agentId: string | null;
	readonly url: string;
}) {
	const repository = yield* namedRepo(input.repo);
	const host = yield* claimingHost(repository);
	const observation = yield* host.adopt(input.url, repository);
	const commit = yield* Commit;
	yield* commit
		.commit(adopt, {
			requestId: Request.make(input.callId),
			...(input.adoptionId === undefined ? {} : { adoptionId: input.adoptionId }),
			pieceId: PieceId.make(input.pieceId),
			repoId: repository.id,
			agentId: input.agentId,
			host: host.tag,
			observation,
			observedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	const held = (yield* readWorld).changes.find(
		(row) => row.repoId === repository.id && row.host === host.tag && row.externalId === observation.externalId,
	);
	return held === undefined ? yield* new ChangeHostRefused({ host: host.tag, detail: "Adopted change is no longer available" }) : held;
});
