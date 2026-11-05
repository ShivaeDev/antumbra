import { launch as command } from "@antumbra/domain-pieces/commands/launch.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { Clock, Effect, type Semaphore } from "effect";

export const launch = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.launch")(
		function* (input: typeof command.Input.Type) {
			const history = yield* PieceHistory;
			yield* history.checkRequest(input.requestId);
			const stored = yield* history.byId(input.id);
			if (stored === null) return yield* command.reject.Unknown({ id: input.id });
			const at = yield* Clock.currentTimeMillis;
			return yield* history.append(input.requestId, {
				_tag: "PieceLaunched",
				id: input.id,
				launchedAt: stored.launchedAt ?? new Date(at).toISOString(),
			});
		},
		serial.withPermit,
		withExecutionWrite,
	);
