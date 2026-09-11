import { type SettingChange, Settings, type SettingsReading, SettingsSource } from "@antumbra/contract";
import type { Api } from "@antumbra/rpc/client.ts";
import type { settings } from "@antumbra/settings-domain/feature.ts";
import { CountKey, FlagKey } from "@antumbra/settings-domain/ids.ts";
import { Effect, Layer, Option, Schema } from "effect";
import { once, ServerReach } from "#adapters/server-reach.ts";

type Reach<Failure> = Api<readonly [typeof settings], Failure>;

const asFlag = Schema.decodeUnknownOption(Schema.Struct({ key: FlagKey, value: Schema.Boolean }));

const asCount = Schema.decodeUnknownOption(Schema.Struct({ key: CountKey, value: Schema.Number }));

const decodeSettings = Schema.decodeUnknownEffect(Settings);

const reading = <Failure>(reach: Reach<Failure>): Effect.Effect<SettingsReading> =>
	Effect.gen(function* () {
		const held: Record<string, boolean | number> = {};
		for (const flag of yield* once(reach.settings.flags({}))) {
			held[flag.key] = flag.on;
		}
		for (const count of yield* once(reach.settings.counts({}))) {
			held[count.key] = count.count;
		}
		return { settings: yield* Effect.orDie(decodeSettings(held)) };
	});

const setting = <Failure>(reach: Reach<Failure>, change: SettingChange): Effect.Effect<number, unknown> => {
	const flag = asFlag(change);
	if (Option.isSome(flag)) {
		return reach.settings.setFlag({ key: flag.value.key, on: flag.value.value });
	}
	const count = asCount(change);
	if (Option.isSome(count)) {
		return reach.settings.setCount({ count: count.value.value, key: count.value.key });
	}
	return Effect.die(new Error(`${change.key} does not take ${String(change.value)}`));
};

export const settingsOver = <Failure>(reach: Reach<Failure>): SettingsSource["Service"] => ({
	change: (change: SettingChange) => Effect.andThen(setting(reach, change), reading(reach)),
	current: reading(reach),
});

export const SettingsOverRpc: Layer.Layer<SettingsSource, never, ServerReach> = Layer.effect(SettingsSource)(Effect.map(ServerReach, settingsOver));
