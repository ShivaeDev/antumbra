import {
	type BoardOwnerNotFound,
	BoardScope,
	Boards,
	type StoredBoardEntryInvalid,
	smoothBodies,
} from "@antumbra/boards";
import type { PrismaError } from "@antumbra/persistence";
import { Deferred, Effect, Option } from "effect";
import { composeCaptainCharter } from "#charter-captain.ts";
import type { AgentDeps, SpawnRefused } from "#deps.ts";
import {
	CaptainAlreadyHailed,
	type StoredChangeInvalid,
	type StoredPieceChangeInvalid,
	VoyageNotFound,
} from "#errors.ts";
import { CAPTAIN_ROLE, captainAtWork } from "#voyage-captain.ts";
import { voyageView } from "#voyage-view.ts";
import { readVoyageWorld } from "#voyage-world.ts";

export interface HailedCaptain {
	readonly agentId: string;
	readonly intentId: string;
}

export type HailRefused =
	| BoardOwnerNotFound
	| CaptainAlreadyHailed
	| PrismaError
	| SpawnRefused
	| StoredBoardEntryInvalid
	| StoredChangeInvalid
	| StoredPieceChangeInvalid
	| VoyageNotFound;

// why: hailing materializes the role for the voyage as it stands right now —
// north star, board and pieces are read at the moment of the hail, because a
// captain's session is mortal and the voyage is not.
export const hailCaptain = (deps: AgentDeps, voyageId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const world = yield* readVoyageWorld(deps);
		const voyage = world.voyages.find((row) => row.id === voyageId);
		if (voyage === undefined) {
			return yield* new VoyageNotFound({ voyageId });
		}
		const standing = captainAtWork(world, voyageId);
		if (Option.isSome(standing)) {
			return yield* new CaptainAlreadyHailed({
				agentId: standing.value.agentId,
				voyageId,
			});
		}
		const voyageSmoothLog = yield* boards
			.read(BoardScope.Voyage({ voyageId }))
			.pipe(Effect.map(smoothBodies));
		const agentId = crypto.randomUUID();
		// why: the hail is answered from the window or the router, never from
		// inside a session, so it may wait for the kernel to be reachable and
		// hand back the intent it just asked for.
		const reach = yield* Deferred.await(deps.kernelReach);
		const intentId = yield* reach.submitSpawn({
			agentId,
			backend: voyage.backend,
			charter: composeCaptainCharter(voyage, voyageView(world, voyage).pieces, {
				voyageSmoothLog,
			}),
			role: CAPTAIN_ROLE,
			// why: the sole runner in v1 — the field becomes a choice when a
			// second runner exists to choose between.
			runner: "local",
			sessionId: crypto.randomUUID(),
			voyageId,
		});
		return { agentId, intentId };
	});
