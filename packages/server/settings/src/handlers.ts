import { Effect, Layer } from "effect";
import { SettingsContract } from "#contract.ts";
import { Settings } from "#service.ts";
export const handlers = SettingsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Settings;
		return SettingsContract.application.of({
			"settings.setFlag": (input) => service.setFlag(input).pipe(Effect.catchIf((error) => error._tag !== "AlreadyDone", Effect.die)),
			"settings.setCount": (input) =>
				service.setCount(input).pipe(Effect.catchIf((error) => error._tag !== "OutOfRange" && error._tag !== "AlreadyDone", Effect.die)),
			"settings.flags": (input) => service.flags(input).pipe(Effect.orDie),
			"settings.counts": (input) => service.counts(input).pipe(Effect.orDie),
		});
	}),
);
export const settings = handlers.pipe(Layer.provideMerge(Settings.layer));
