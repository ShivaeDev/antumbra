import { Counts, Flags, SettingsContract } from "@antumbra/server-settings/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Settings } from "#service.ts";
export const handlers = SettingsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Settings;
		return SettingsContract.application.of({
			"settings.setFlag": (input) => service.setFlag(input).pipe(Effect.catchIf((error) => error._tag !== "AlreadyDone", Effect.die)),
			"settings.setCount": (input) =>
				service.setCount(input).pipe(Effect.catchIf((error) => error._tag !== "OutOfRange" && error._tag !== "AlreadyDone", Effect.die)),
			"settings.flags": (input) => stream(readKeys(Flags.reads(input)))(service.flags(input).pipe(Effect.orDie)),
			"settings.counts": (input) => stream(readKeys(Counts.reads(input)))(service.counts(input).pipe(Effect.orDie)),
		});
	}),
);
export const settings = handlers.pipe(Layer.provideMerge(Settings.layer));
