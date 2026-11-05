import { ById, List, Progress, VoyagesContract } from "@antumbra/server-voyages/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Voyages } from "#service.ts";

export const handlers = VoyagesContract.application.toLayer(
	Effect.gen(function* () {
		const voyages = yield* Voyages;
		return VoyagesContract.application.of({
			"voyages.open": (input) =>
				voyages.open(input).pipe(Effect.catchIf((error) => error._tag !== "Blank" && error._tag !== "AlreadyDone", Effect.die)),
			"voyages.setFocus": (input) =>
				voyages.setFocus(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"voyages.quiet": (input) =>
				voyages.quiet(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"voyages.resume": (input) =>
				voyages.resume(input).pipe(Effect.catchIf((error) => error._tag !== "Unknown" && error._tag !== "AlreadyDone", Effect.die)),
			"voyages.byId": (input) => stream(readKeys(ById.reads(input)))(voyages.byId(input).pipe(Effect.orDie)),
			"voyages.list": () => stream(readKeys(List.reads({})))(voyages.list().pipe(Effect.orDie)),
			"voyages.progress": (input) => stream(readKeys(Progress.reads(input)))(voyages.progress(input).pipe(Effect.orDie)),
		});
	}),
);

export const voyages = handlers.pipe(Layer.provideMerge(Voyages.layer));
