import { ArtifactsContract, ById, ByPiece, ReadContent } from "@antumbra/server-artifacts/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { unexpectedLand, unexpectedReadContent, unexpectedRemoveSupersession, unexpectedSupersede } from "#failures.ts";
import { Artifacts } from "#service.ts";
export const handlers = ArtifactsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Artifacts;
		return ArtifactsContract.application.of({
			"artifacts.readContent": (input) =>
				stream(readKeys(ReadContent.reads(input)))(service.readContent(input).pipe(Effect.catchIf(unexpectedReadContent, Effect.die))),
			"artifacts.supersede": (input) => service.supersede(input).pipe(Effect.catchIf(unexpectedSupersede, Effect.die)),
			"artifacts.removeSupersession": (input) => service.removeSupersession(input).pipe(Effect.catchIf(unexpectedRemoveSupersession, Effect.die)),
			"artifacts.land": (input) => service.land(input).pipe(Effect.catchIf(unexpectedLand, Effect.die)),
			"artifacts.byId": (input) => stream(readKeys(ById.reads(input)))(service.byId(input).pipe(Effect.orDie)),
			"artifacts.byPiece": (input) => stream(readKeys(ByPiece.reads(input)))(service.byPiece(input).pipe(Effect.orDie)),
		});
	}),
);
export const artifacts = handlers.pipe(Layer.provideMerge(Artifacts.layer));
