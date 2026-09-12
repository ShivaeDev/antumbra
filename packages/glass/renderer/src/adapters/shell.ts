import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { AppInfo, DraftSnapshot, Serving, type ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Effect, Queue, SchemaParser, Stream } from "effect";
import type { Shell } from "#shell.ts";

export const shellOf = (bridge: ShellBridge): Shell => ({
	info: Effect.promise(() => bridge.appInfo()).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(AppInfo)), Effect.orDie),
	place: Effect.promise(() => bridge.windowPlace()).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(WindowPlace)), Effect.orDie),
	remember: (place) => Effect.promise(() => bridge.rememberPlace(place)),
	open: (place) => Effect.promise(() => bridge.openWindow(place)),
	restart: Effect.promise(() => bridge.restart()),
	openExternal: (url) => bridge.openExternal(url),
});

export const reachOf = (bridge: ShellBridge) =>
	Effect.promise(() => bridge.server()).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(Serving)), Effect.orDie);

export const draftsOf = (bridge: ShellBridge): Drafts => ({
	watch: (ref) =>
		Stream.callback<DraftSnapshot>((queue) =>
			Effect.gen(function* () {
				const stop = bridge.subscribeDraft(ref, (snapshot) => Queue.offerUnsafe(queue, SchemaParser.decodeUnknownSync(DraftSnapshot)(snapshot)));
				yield* Effect.addFinalizer(() => Effect.sync(stop));
				const snapshot = yield* Effect.promise(() => bridge.readDraft(ref)).pipe(
					Effect.flatMap(SchemaParser.decodeUnknownEffect(DraftSnapshot)),
					Effect.orDie,
				);
				yield* Queue.offer(queue, snapshot);
			}),
		),
	write: (ref, text) =>
		Effect.promise(() => bridge.writeDraft(ref, text)).pipe(Effect.flatMap(SchemaParser.decodeUnknownEffect(DraftSnapshot)), Effect.orDie),
	clear: (ref, revision) => Effect.promise(() => bridge.clearDraft(ref, revision)),
});
