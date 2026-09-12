import { type WindowPlace, WindowRefused } from "@antumbra/platform-shell/windows.ts";
import { Context, Effect, Layer } from "effect";
import { openWindow } from "#adapters/windows/open.ts";
import type { OwnedWindow, WindowRegistry, WindowShell } from "#adapters/windows/registry.ts";

const caller = (registry: WindowRegistry): Effect.Effect<OwnedWindow, WindowRefused, RequestOrigin> =>
	Effect.gen(function* () {
		const origin = yield* RequestOrigin;
		const record = registry.windowOf(origin.windowId);
		return record === undefined ? yield* new WindowRefused({ reason: "unknown_window" }) : record;
	});

const openFor = (input: WindowShell, place: WindowPlace) =>
	Effect.gen(function* () {
		const record = yield* caller(input.registry);
		if (record.place.role !== "console") {
			return yield* new WindowRefused({ reason: "not_the_console" });
		}
		if (place.role === "console") {
			return yield* new WindowRefused({ reason: "console_is_not_a_target" });
		}
		const held = input.registry.holding(place);
		if (held === undefined) {
			return yield* Effect.orDie(
				openWindow({
					document: input.document,
					place,
					registry: input.registry,
				}),
			);
		}
		return yield* Effect.sync(() => {
			held.handle.show();
			held.handle.focus();
		});
	});

const rememberFor = (input: WindowShell, place: WindowPlace) =>
	Effect.gen(function* () {
		const record = yield* caller(input.registry);
		if (record.place.role !== place.role) {
			return yield* new WindowRefused({ reason: "role_is_immutable" });
		}
		return yield* Effect.sync(() => input.registry.remember(record.id, place));
	});

export const WindowSourceLive = (input: WindowShell) =>
	Layer.succeed(WindowSource, {
		open: (place) => Effect.asVoid(openFor(input, place)),
		place: Effect.map(caller(input.registry), (record) => record.place),
		remember: (place) => rememberFor(input, place),
	});

export class RequestOrigin extends Context.Service<RequestOrigin, { readonly windowId: string }>()("@antumbra/desktop/WindowOrigin") {}
export class WindowSource extends Context.Service<
	WindowSource,
	{
		readonly open: (place: WindowPlace) => Effect.Effect<void, WindowRefused, RequestOrigin>;
		readonly place: Effect.Effect<WindowPlace, WindowRefused, RequestOrigin>;
		readonly remember: (place: WindowPlace) => Effect.Effect<void, WindowRefused, RequestOrigin>;
	}
>()("@antumbra/desktop/WindowSource") {}
