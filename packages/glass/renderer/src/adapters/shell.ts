import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { AppInfo, Serving, type ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Effect, Schema, SchemaParser } from "effect";
import type { Shell } from "#shell.ts";

export const shellOf = (bridge: ShellBridge): Shell => ({
	info: Effect.promise(() => bridge.appInfo()).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(AppInfo)), Effect.orDie),
	place: Effect.promise(() => bridge.windowPlace()).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(WindowPlace)), Effect.orDie),
	remember: (place) => Effect.promise(() => bridge.rememberPlace(place)),
	open: (place) => Effect.promise(() => bridge.openWindow(place)),
	restart: Effect.promise(() => bridge.restart()),
	restartServer: Effect.promise(() => bridge.restartServer()),
	openExternal: (url) => bridge.openExternal(url),
});

export const reachOf = (bridge: ShellBridge) =>
	Effect.promise(() => bridge.server()).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(Serving)), Effect.orDie);

const draftValue = Schema.NullOr(Schema.String);

export const draftsOf =
	(bridge: ShellBridge): Drafts =>
	(ref) => ({
		getItem: () => Effect.promise(() => bridge.readDraft(ref)).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(draftValue)), Effect.orDie),
		setItem: (_key, value, expected) => Effect.promise(() => bridge.writeDraft(ref, value, expected)),
		removeItem: (_key, expected) => Effect.promise(() => bridge.clearDraft(ref, expected)),
		subscribe: (_key, listener) => bridge.subscribeDraft(ref, (value) => listener(SchemaParser.decodeUnknownSync(draftValue)(value))),
	});
