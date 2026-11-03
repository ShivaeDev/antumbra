import { launch } from "@antumbra/domain-pieces/commands/launch.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { PieceProgressObserved } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { Effect, type Semaphore } from "effect";

export const observeProgress = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.observeProgress")(function* (requestId: Request, evidence: typeof PieceProgressObserved.Type) {
		const history = yield* PieceHistory;
		if ((yield* history.byId(evidence.id)) === null) return yield* launch.reject.Unknown({ id: evidence.id });
		return yield* history.append(requestId, { _tag: "PieceProgressObserved", ...evidence });
	}, serial.withPermit);
