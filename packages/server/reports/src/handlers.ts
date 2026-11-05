import { ById, ByPiece, ForVoyage, ReportsContract } from "@antumbra/server-reports/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Reports } from "#service.ts";
export const handlers = ReportsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Reports;
		return ReportsContract.application.of({
			"reports.land": (input) =>
				service.land(input).pipe(Effect.catchIf((error) => error._tag !== "PieceNotFound" && error._tag !== "AlreadyDone", Effect.die)),
			"reports.byId": (input) => stream(readKeys(ById.reads(input)))(service.byId(input).pipe(Effect.orDie)),
			"reports.byPiece": (input) => stream(readKeys(ByPiece.reads(input)))(service.byPiece(input).pipe(Effect.orDie)),
			"reports.forVoyage": (input) => stream(readKeys(ForVoyage.reads(input)))(service.forVoyage(input).pipe(Effect.orDie)),
		});
	}),
);
export const reports = handlers.pipe(Layer.provideMerge(Reports.layer));
