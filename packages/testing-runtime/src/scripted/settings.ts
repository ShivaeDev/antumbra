import { SETTING_FALLBACKS, type SettingChange, type Settings, type SettingsReading, SettingsSource } from "@antumbra/contract";
import { Effect, Layer, Ref } from "effect";

const held = (settings: Settings, change: SettingChange): Settings => ({ ...settings, [change.key]: change.value });

export const scriptedSettings: Layer.Layer<SettingsSource> = Layer.effect(SettingsSource)(
	Effect.map(Ref.make(SETTING_FALLBACKS), (state) => {
		const reading = Effect.map(Ref.get(state), (settings): SettingsReading => ({ settings }));
		return {
			change: (change: SettingChange) =>
				Effect.andThen(
					Ref.update(state, (settings) => held(settings, change)),
					reading,
				),
			current: reading,
		};
	}),
);
