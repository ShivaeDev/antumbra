import { charter as command } from "@antumbra/domain-pieces/commands/charter.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { PieceHistory } from "@antumbra/server-storage/pieces/service.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
import { wiring } from "#wiring.ts";

export const charter = (serial: Semaphore.Semaphore) =>
	Effect.fn("Pieces.charter")(
		function* (input: typeof command.Input.Type) {
			const history = yield* PieceHistory;
			yield* history.checkRequest(input.requestId);
			const voyages = yield* VoyageHistory;
			const said = { title: input.title.trim(), charter: input.charter.trim(), role: input.role.trim(), expectation: input.expectation };
			for (const field of ["title", "charter", "role"] as const) {
				if (said[field] === "") return yield* command.reject.Blank({ field, message: `A piece needs a ${field}` });
			}
			if ((yield* voyages.byId(input.voyageId)) === null) return yield* command.reject.UnknownVoyage({ voyageId: input.voyageId });
			const id = PieceId.make(input.requestId);
			const dependsOn = yield* wiring(id, input.dependsOn);
			const at = yield* Clock.currentTimeMillis;
			return yield* history.append(input.requestId, {
				_tag: "PieceChartered",
				...said,
				id,
				voyageId: input.voyageId,
				dependsOn,
				charteredAt: new Date(at).toISOString(),
			});
		},
		serial.withPermit,
		withExecutionWrite,
	);
