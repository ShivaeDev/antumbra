import type { AppInfo } from "@antumbra/platform-shell/bridge.ts";
import type { WindowPlace } from "@antumbra/platform-shell/windows.ts";
import type { Effect } from "effect";

export interface Shell {
	readonly info: Effect.Effect<AppInfo, unknown>;
	readonly place: Effect.Effect<WindowPlace, unknown>;
	readonly remember: (place: WindowPlace) => Effect.Effect<void, unknown>;
	readonly open: (place: WindowPlace) => Effect.Effect<void, unknown>;
	readonly restart: Effect.Effect<void, unknown>;
	readonly openExternal: (url: string) => void;
}
