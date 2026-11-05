import { landVerdict as command } from "@antumbra/domain-pieces/commands/land-verdict.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Effect, type Semaphore } from "effect";

export const landVerdict = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.landVerdict")(
		function* (input: typeof command.Input.Type) {
			const history = yield* PieceHistory;
			yield* history.checkRequest(input.requestId);
			if ((yield* history.byId(input.id)) === null) return yield* command.reject.Unknown({ id: input.id });
			return yield* history.append(input.requestId, { _tag: "PieceVerdictLanded", id: input.id, verdict: input.verdict });
		},
		serial.withPermit,
		withExecutionWrite,
	);
