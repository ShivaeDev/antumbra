import { type BoardOwnerNotFound, BoardScope, Boards, type StoredBoardEntryInvalid, smoothBodies } from "@antumbra/boards";
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

export type HailRefused =
	| BoardOwnerNotFound
	| CaptainAlreadyHailed
	| CaptainSessionUnavailable
	| RulingReadFailure
	| SpawnRefused
	| StoredBoardEntryInvalid
	| VoyageNotFound
	| VoyageWorldReadFailure;

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
		const intentId = yield* reach.submitSpawn({
			agentId,
			backend: voyage.captainBackend,
			charter: charterForKind(voyage.kind, {
				context: voyage.context,
				northStar: voyage.northStar,
				pieceLines: voyageView(world, voyage).pieces.map(pieceLineWithOutcomes),
				rulings: bindingRulings.map(rulingLine),
				voyageLog: voyageSmoothLog,
			}),
			role: CAPTAIN_ROLE,
			runner: "local",
			sessionId: crypto.randomUUID(),
			voyageId,
		});
		return { agentId, intentId };
	});
