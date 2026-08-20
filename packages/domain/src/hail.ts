import type { StoredArtifactLineageInvalid } from "@antumbra/artifacts";
import {
	type BoardOwnerNotFound,
	BoardScope,
	Boards,
	type StoredBoardEntryInvalid,
	type StoredBoardOwnerKindInvalid,
	smoothBodies,
} from "@antumbra/boards";
import type {
	StoredChangeInvalid,
	StoredPieceChangeInvalid,
} from "@antumbra/changes";
import type { PrismaError } from "@antumbra/persistence";
import type {
	InvalidSessionExecutionStatus,
	StoredAgentSessionStatusInvalid,
	StoredAgentStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { composeCaptainCharter } from "#charter-captain.ts";
import {
	CaptainAlreadyHailed,
	CaptainSessionUnavailable,
	VoyageNotFound,
} from "#errors.ts";
import type { SpawnRefused } from "#kernel-reach.ts";
import { KernelReach } from "#kernel-reach.ts";
import { CAPTAIN_ROLE, captainAtWork, captainOf } from "#voyage-captain.ts";
import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import { voyageView } from "#voyage-view.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

export interface HailedCaptain {
	readonly agentId: string;
	readonly intentId: string;
}

export type HailRefused =
	| BoardOwnerNotFound
	| CaptainAlreadyHailed
	| CaptainSessionUnavailable
	| InvalidSessionExecutionStatus
	| PrismaError
	| SpawnRefused
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid
	| StoredArtifactLineageInvalid
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid
	| StoredChangeInvalid
	| StoredPieceChangeInvalid
	| VoyageNotFound;

// why: hailing materializes the role for the voyage as it stands right now —
// north star, board and pieces are read at the moment of the hail, because a
// captain's session is mortal and the voyage is not.
export const hailCaptain = (voyageId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const reach = yield* KernelReach;
		const source = yield* VoyageWorldSource;
		const world = yield* source.read;
		const voyage = world.voyages.find((row) => row.id === voyageId);
		if (voyage === undefined) {
			return yield* new VoyageNotFound({ voyageId });
		}
		// why: hailing a voyage that already has an alive captain asks for that
		// captain to be reachable, never for a second one. Recovery is idempotent,
		// so one act serves a captain that stood down, one whose attachment did
		// not outlive its process, and one that is answering already.
		const current = captainOf(world, voyageId);
		if (Option.isSome(current) && current.value.status === "alive") {
			const session = executionSessionOfAgent(world, current.value.agentId);
			if (session === undefined) {
				return yield* new CaptainSessionUnavailable({
					agentId: current.value.agentId,
					detail: "no open execution to resume",
					voyageId,
				});
			}
			const intentId = yield* reach.submitRecovery(session.id);
			return { agentId: current.value.agentId, intentId };
		}
		// why: a captain still being born is at work and has no execution to
		// resume yet, so answering the hail would give the voyage a second one.
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
