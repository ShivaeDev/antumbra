import { Context, type Effect, Schema } from "effect";

export const AppInfo = Schema.Struct({
	chromeVersion: Schema.String,
	electronVersion: Schema.String,
	nodeVersion: Schema.String,
	productVersion: Schema.String,
});

export type AppInfo = typeof AppInfo.Type;

export class AppInfoSource extends Context.Service<AppInfoSource, { readonly current: Effect.Effect<AppInfo> }>()(
	"@antumbra/contract/AppInfoSource",
) {}
