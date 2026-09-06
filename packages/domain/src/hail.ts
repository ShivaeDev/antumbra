import { BoardScope, Boards, entryBodies } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { RoleSettings } from "@antumbra/settings";
import { decodeStoredVoyageKind } from "@antumbra/vocabulary/voyage.ts";
import { captainRoleOf } from "@antumbra/voyages/captain-role";
import { Effect, Option } from "effect";
import { charterForKind } from "#charter-flagship.ts";
import { CaptainAlreadyHailed, CaptainSessionUnavailable, VoyageNotFound } from "#errors.ts";
import { KernelReach } from "#kernel-reach/service.ts";
import { pieceLineWithOutcomes } from "#piece-line.ts";
import { rulingLine, standingRulingsFor } from "#standing-rulings.ts";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import { readVoyageCaptain } from "#voyage-captain-read.ts";
import { voyageRow } from "#voyage-row-projection.ts";
import { voyageView } from "#voyage-view.ts";

export interface HailedCaptain {
	readonly agentId: string;
	readonly intentId: string;
}

export const hailCaptain = Effect.fn("Voyages.hail")(function* (voyageId: string) {
	const boards = yield* Boards;
	const reach = yield* KernelReach;
	const db = yield* Database;
	const storedVoyage = yield* db.Voyage.where({ id: voyageId }).first();
	if (Option.isNone(storedVoyage)) {
		return yield* new VoyageNotFound({ voyageId });
	}
	const kind = yield* Effect.fromResult(decodeStoredVoyageKind(voyageId, storedVoyage.value.kind));
	const voyage = voyageRow(storedVoyage.value, kind);
	const current = yield* readVoyageCaptain(voyageId);
	if (Option.isSome(current) && current.value.status === "alive") {
		const sessionId = current.value.sessionId;
		if (sessionId === null) {
			return yield* new CaptainSessionUnavailable({
				agentId: current.value.agentId,
				detail: "no open execution to resume",
				voyageId,
			});
		}
		const intentId = yield* reach.submitWake({ sessionId });
		return { agentId: current.value.agentId, intentId };
	}
	if (Option.isSome(current) && current.value.atWork) {
		return yield* new CaptainAlreadyHailed({
			agentId: current.value.agentId,
			voyageId,
		});
	}
	const details = yield* VoyageDetails;
	const detail = yield* details.read(voyageId);
	if (Option.isNone(detail)) return yield* new VoyageNotFound({ voyageId });
	const voyageLog = yield* boards.digest(BoardScope.Voyage({ voyageId })).pipe(Effect.map(entryBodies));
	const agentId = crypto.randomUUID();
	const bindingRulings = yield* standingRulingsFor({
		agentId,
		pieceId: Option.none(),
		voyageId: Option.some(voyageId),
	});
	const settings = yield* (yield* RoleSettings).resolve(voyageId, captainRoleOf(voyage.kind));
	const intentId = yield* reach.submitSpawn({
		agentId,
		...settings,
		charter: charterForKind(voyage.kind, {
			context: voyage.context,
			northStar: voyage.northStar,
			pieceLines: voyageView(detail.value.rows, voyage).pieces.map(pieceLineWithOutcomes),
			rulings: bindingRulings.map(rulingLine),
			voyageLog,
		}),
		role: CAPTAIN_ROLE,
		runner: "local",
		sessionId: crypto.randomUUID(),
		voyageId,
	});
	return { agentId, intentId };
});
