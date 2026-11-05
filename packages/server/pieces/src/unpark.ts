import { unpark as command } from "@antumbra/domain-pieces/commands/unpark.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Effect, type Semaphore } from "effect";

export const unpark = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.unpark")(
		function* (input: typeof command.Input.Type) {
			const history = yield* PieceHistory;
			yield* history.checkRequest(input.requestId);
			if ((yield* history.byId(input.id)) === null) return yield* command.reject.Unknown({ id: input.id });
			return yield* history.append(input.requestId, { _tag: "PieceUnparked", id: input.id });
		},
		serial.withPermit,
		withExecutionWrite,
	);
