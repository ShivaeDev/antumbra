import { Context, Data, type Effect, Schema } from "effect";
import { SETTINGS, SettingKey } from "#settings/catalog.ts";
import { SettingValue } from "#settings/declaration.ts";

const fields: { readonly [K in SettingKey]: (typeof SETTINGS)[K]["value"] } = {
	foldToolCalls: SETTINGS.foldToolCalls.value,
	maxParallelSessions: SETTINGS.maxParallelSessions.value,
	idleSiestaMinutes: SETTINGS.idleSiestaMinutes.value,
	routineMailMinutes: SETTINGS.routineMailMinutes.value,
	retireRestMinutes: SETTINGS.retireRestMinutes.value,
	retireSweep: SETTINGS.retireSweep.value,
	holdEverything: SETTINGS.holdEverything.value,
	holdPieceDispatch: SETTINGS.holdPieceDispatch.value,
	holdWakes: SETTINGS.holdWakes.value,
};

export const Settings = Schema.Struct(fields);
export type Settings = typeof Settings.Type;

export const SettingsReading = Schema.Struct({
	overridden: Schema.Array(SettingKey),
	settings: Settings,
});
export type SettingsReading = typeof SettingsReading.Type;

export const SettingChange = Schema.Struct({
	key: SettingKey,
	value: SettingValue,
});
export type SettingChange = typeof SettingChange.Type;

export class SettingRefused extends Data.TaggedError("SettingRefused")<{
	readonly expects: string;
	readonly key: SettingKey;
}> {
	override get message(): string {
		return `${this.key} expects ${this.expects}`;
	}
}

export class SettingsSource extends Context.Service<
	SettingsSource,
	{
		readonly change: (change: SettingChange) => Effect.Effect<SettingsReading, unknown>;
		readonly current: Effect.Effect<SettingsReading, unknown>;
	}
>()("@antumbra/contract/SettingsSource") {}
