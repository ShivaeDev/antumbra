import { Effect, Layer } from "effect";
import { ReportsContract } from "#contract.ts";
import { Reports } from "#service.ts";
export const handlers = ReportsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Reports;
		return ReportsContract.application.of({
			"reports.land": (input) =>
				service.land(input).pipe(Effect.catchIf((error) => error._tag !== "PieceNotFound" && error._tag !== "AlreadyDone", Effect.die)),
			"reports.byId": (input) => service.byId(input).pipe(Effect.orDie),
			"reports.byPiece": (input) => service.byPiece(input).pipe(Effect.orDie),
			"reports.forVoyage": (input) => service.forVoyage(input).pipe(Effect.orDie),
		});
	}),
);
export const reports = handlers.pipe(Layer.provideMerge(Reports.layer));
