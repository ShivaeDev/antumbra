import { Context, type Effect } from "effect";

export class AppLifecycleSource extends Context.Service<AppLifecycleSource, { readonly restart: Effect.Effect<void> }>()(
	"@antumbra/contract/AppLifecycleSource",
) {}
