import type { HoldWaiting } from "@antumbra/contract";
import { readyPieces } from "#dispatch-policy.ts";
import type { DispatchWorld } from "#voyage-rows.ts";

export const dispatchWaiting = (world: DispatchWorld, nowMillis: number): ReadonlyArray<HoldWaiting> =>
	readyPieces(world).map((candidate) => ({
		id: candidate.piece.id,
		mail: null,
		title: candidate.piece.title,
		voyage: candidate.voyage.name,
		waitedMillis: nowMillis - (candidate.piece.launchedAt?.getTime() ?? nowMillis),
	}));
