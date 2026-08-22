import { Context, type Effect, Schema } from "effect";

export const DEFAULT_MAX_PARALLEL_SESSIONS = 4;
export const MIN_MAX_PARALLEL_SESSIONS = 1;
export const MAX_MAX_PARALLEL_SESSIONS = 64;

const ParallelSessionLimit = Schema.Number.check(
	Schema.isInt(),
	Schema.isGreaterThanOrEqualTo(MIN_MAX_PARALLEL_SESSIONS),
	Schema.isLessThanOrEqualTo(MAX_MAX_PARALLEL_SESSIONS),
);

export const Settings = Schema.Struct({
	maxParallelSessions: ParallelSessionLimit,
});
export type Settings = typeof Settings.Type;

export const UpdateSettings = Settings;
export type UpdateSettings = typeof UpdateSettings.Type;

export class SettingsSource extends Context.Service<
	SettingsSource,
	{
		readonly current: Effect.Effect<Settings, unknown>;
		readonly update: (
			settings: UpdateSettings,
		) => Effect.Effect<Settings, unknown>;
	}
>()("@antumbra/contract/SettingsSource") {}
