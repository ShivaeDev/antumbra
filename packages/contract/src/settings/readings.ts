import { Context, Data, type Effect, Schema } from "effect";
import { SETTINGS, SettingKey } from "#settings/catalog.ts";
import { SettingValue } from "#settings/declaration.ts";

// why: the annotation is the completeness check. A declared setting left out
// of the struct would be a setting nothing could read over the bridge, and a
// struct field the catalog does not declare has no default to fall back to.
const fields: { readonly [K in SettingKey]: (typeof SETTINGS)[K]["value"] } = {
	foldToolCalls: SETTINGS.foldToolCalls.value,
	maxParallelSessions: SETTINGS.maxParallelSessions.value,
	idleSiestaMinutes: SETTINGS.idleSiestaMinutes.value,
	retireRestMinutes: SETTINGS.retireRestMinutes.value,
	retireSweep: SETTINGS.retireSweep.value,
};

export const Settings = Schema.Struct(fields);
export type Settings = typeof Settings.Type;

// why: the reading carries every setting's value beside the keys the admiral
// actually chose, so a surface can tell a chosen value from the catalog's own
// without asking a second question and without knowing where rows live.
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

// why: the wire can only carry the shape a setting's value might take, never
// the bounds one particular declaration puts on it. The refusal is where that
// second question is answered, and it names the declaration that asked it.
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
		readonly change: (
			change: SettingChange,
		) => Effect.Effect<SettingsReading, unknown>;
		readonly current: Effect.Effect<SettingsReading, unknown>;
	}
>()("@antumbra/contract/SettingsSource") {}
