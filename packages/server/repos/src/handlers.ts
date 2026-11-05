import { ReposContract } from "@antumbra/server-repos/contract.ts";
import { Effect, Layer } from "effect";
import { Repos } from "#service.ts";
export const handlers = ReposContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Repos;
		return ReposContract.application.of({
			"repos.register": (input) =>
				service.register(input).pipe(Effect.catchIf((error) => error._tag !== "SlugTaken" && error._tag !== "AlreadyDone", Effect.die)),
			"repos.forget": (input) =>
				service.forget(input).pipe(Effect.catchIf((error) => error._tag !== "Referenced" && error._tag !== "AlreadyDone", Effect.die)),
			"repos.all": (input) => service.all(input).pipe(Effect.orDie),
			"repos.byId": (input) => service.byId(input).pipe(Effect.orDie),
			"repos.byIds": (input) => service.byIds(input).pipe(Effect.orDie),
		});
	}),
);
export const repos = handlers.pipe(Layer.provideMerge(Repos.layer));
