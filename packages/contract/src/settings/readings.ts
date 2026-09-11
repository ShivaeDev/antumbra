import { Context, type Effect, Schema } from "effect";
import { SettingKey } from "#settings/catalog.ts";

export const SettingValue = Schema.Union([Schema.Boolean, Schema.Number]);
export type SettingValue = typeof SettingValue.Type;

export const Settings = Schema.Struct({
	foldToolCalls: Schema.Boolean,
	maxParallelSessions: Schema.Number,
	idleSiestaMinutes: Schema.Number,
	routineMailMinutes: Schema.Number,
	retireRestMinutes: Schema.Number,
	retireSweep: Schema.Boolean,
	holdEverything: Schema.Boolean,
	holdPieceDispatch: Schema.Boolean,
	holdWakes: Schema.Boolean,
});
export type Settings = typeof Settings.Type;

export const SETTING_FALLBACKS: Settings = {
	foldToolCalls: false,
	maxParallelSessions: 4,
	idleSiestaMinutes: 60,
	routineMailMinutes: 5,
	retireRestMinutes: 15,
	retireSweep: true,
	holdEverything: false,
	holdPieceDispatch: false,
	holdWakes: false,
};

export const SettingsReading = Schema.Struct({
	settings: Settings,
});
export type SettingsReading = typeof SettingsReading.Type;

export const SettingChange = Schema.Struct({
	key: SettingKey,
	value: SettingValue,
});
export type SettingChange = typeof SettingChange.Type;

export class SettingsSource extends Context.Service<
	SettingsSource,
	{
		readonly change: (change: SettingChange) => Effect.Effect<SettingsReading, unknown>;
		readonly current: Effect.Effect<SettingsReading, unknown>;
	}
>()("@antumbra/contract/SettingsSource") {}
