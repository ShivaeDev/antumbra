import { All, ById, ByIds, ReposContract } from "@antumbra/server-repos/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Repos } from "#service.ts";
export const handlers = ReposContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Repos;
		return ReposContract.application.of({
			"repos.register": (input) =>
				service.register(input).pipe(Effect.catchIf((error) => error._tag !== "SlugTaken" && error._tag !== "AlreadyDone", Effect.die)),
			"repos.forget": (input) =>
				service.forget(input).pipe(Effect.catchIf((error) => error._tag !== "Referenced" && error._tag !== "AlreadyDone", Effect.die)),
			"repos.all": (input) => stream(readKeys(All.reads(input)))(service.all(input).pipe(Effect.orDie)),
			"repos.byId": (input) => stream(readKeys(ById.reads(input)))(service.byId(input).pipe(Effect.orDie)),
			"repos.byIds": (input) => stream(readKeys(ByIds.reads(input)))(service.byIds(input).pipe(Effect.orDie)),
		});
	}),
);
export const repos = handlers.pipe(Layer.provideMerge(Repos.layer));
