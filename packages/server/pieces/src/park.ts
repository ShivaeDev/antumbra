import { park as command } from "@antumbra/domain-pieces/commands/park.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Clock, Effect, type Semaphore } from "effect";

export const park = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.park")(
		function* (input: typeof command.Input.Type) {
			const history = yield* PieceHistory;
			yield* history.checkRequest(input.requestId);
			const stored = yield* history.byId(input.id);
			if (stored === null) return yield* command.reject.Unknown({ id: input.id });
			const at = yield* Clock.currentTimeMillis;
			return yield* history.append(input.requestId, { _tag: "PieceParked", id: input.id, parkedAt: stored.parkedAt ?? new Date(at).toISOString() });
		},
		serial.withPermit,
		withExecutionWrite,
	);
