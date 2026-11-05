import { rewire as command } from "@antumbra/domain-pieces/commands/rewire.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Effect, type Semaphore } from "effect";
import { wiring } from "#wiring.ts";
export const rewire = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.rewire")(
		function* (input: typeof command.Input.Type) {
			const history = yield* PieceHistory;
			yield* history.checkRequest(input.requestId);
			if ((yield* history.byId(input.id)) === null) return yield* command.reject.Unknown({ id: input.id });
			return yield* history.append(input.requestId, { _tag: "PieceRewired", id: input.id, dependsOn: yield* wiring(input.id, input.dependsOn) });
		},
		serial.withPermit,
		withExecutionWrite,
	);
