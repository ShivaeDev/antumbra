import { Defaults, ForVoyage, Resolve, RoleSettingsContract } from "@antumbra/server-role-settings/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { RoleSettings } from "#service.ts";
export const handlers = RoleSettingsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* RoleSettings;
		return RoleSettingsContract.application.of({
			"roleSettings.choose": (input) => service.choose(input).pipe(Effect.catchIf((error) => error._tag !== "AlreadyDone", Effect.die)),
			"roleSettings.defaults": (input) => stream(readKeys(Defaults.reads(input)))(service.defaults(input).pipe(Effect.orDie)),
			"roleSettings.forVoyage": (input) => stream(readKeys(ForVoyage.reads(input)))(service.forVoyage(input).pipe(Effect.orDie)),
			"roleSettings.resolve": (input) => stream(readKeys(Resolve.reads(input)))(service.resolve(input).pipe(Effect.orDie)),
		});
	}),
);
export const roleSettings = handlers.pipe(Layer.provideMerge(RoleSettings.layer));
