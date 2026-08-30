import {
	type BoardOwnerNotFound,
	BoardScope,
	Boards,
	type StoredBoardEntryInvalid,
	type StoredBoardOwnerKindInvalid,
	smoothBodies,
} from "@antumbra/boards";
import type { RulingReadFailure } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { charterForKind } from "#charter-flagship.ts";
import { CaptainAlreadyHailed, CaptainSessionUnavailable, VoyageNotFound } from "#errors.ts";
import type { SpawnRefused } from "#kernel-reach.ts";
import { KernelReach } from "#kernel-reach.ts";
import { pieceLineWithOutcomes } from "#piece-line.ts";
import { rulingLine, standingRulingsFor } from "#standing-rulings.ts";
import { CAPTAIN_ROLE, captainAtWork, captainOf } from "#voyage-captain.ts";
import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import { voyageView } from "#voyage-view.ts";
import { type VoyageWorldReadFailure, VoyageWorldSource } from "#voyage-world.ts";

export interface HailedCaptain {
	readonly agentId: string;
	readonly intentId: string;
}

// why: a hail reads the whole voyage world, so every way that reading can fail
// is a way a hail can be refused — named as the one union rather than copied
// out member by member, which is how this list fell behind the world it reads.
export type HailRefused =
	| BoardOwnerNotFound
	| CaptainAlreadyHailed
	| CaptainSessionUnavailable
	| RulingReadFailure
	| SpawnRefused
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid
	| VoyageNotFound
	| VoyageWorldReadFailure;

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
		// captain to be reachable, never for a second one. A wake is idempotent,
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
			const intentId = yield* reach.submitWake({ sessionId: session.id });
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
		const voyageSmoothLog = yield* boards.read(BoardScope.Voyage({ voyageId })).pipe(Effect.map(smoothBodies));
		const agentId = crypto.randomUUID();
		const bindingRulings = yield* standingRulingsFor({
			agentId,
			pieceId: Option.none(),
			voyageId: Option.some(voyageId),
		});
		// why: the hail is answered from the window or the router, never from
		// inside a session, so it may wait for the kernel to be reachable and
		// hand back the intent it just asked for.
		const intentId = yield* reach.submitSpawn({
			agentId,
			backend: voyage.backend,
			charter: charterForKind(voyage.kind, {
				context: voyage.context,
				northStar: voyage.northStar,
				pieceLines: voyageView(world, voyage).pieces.map(pieceLineWithOutcomes),
				rulings: bindingRulings.map(rulingLine),
				voyageLog: voyageSmoothLog,
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
